'use client';

export interface ProposalSimilarity {
  id: number;
  title: string;
  similarity: number;
  reason: string;
}

/**
 * Check if a proposal is similar to existing ones
 */
export async function checkDuplicateProposal(
  title: string,
  description: string,
  existingProposals: Array<{ id: number; title: string; description: string }>
): Promise<{ isDuplicate: boolean; similar: ProposalSimilarity[]; suggestions: string[] }> {
  try {
    // First, do a simple text-based duplicate check (no AI needed)
    const similar: ProposalSimilarity[] = [];
    
    for (const existing of existingProposals) {
      // Check for exact title match
      if (existing.title.toLowerCase().trim() === title.toLowerCase().trim()) {
        similar.push({
          id: existing.id,
          title: existing.title,
          similarity: 100,
          reason: 'Exact title match'
        });
        continue;
      }
      
      // Check for very similar titles (simple word matching)
      const titleWords = title.toLowerCase().split(/\s+/);
      const existingWords = existing.title.toLowerCase().split(/\s+/);
      const commonWords = titleWords.filter(word => 
        word.length > 3 && existingWords.includes(word)
      );
      
      if (commonWords.length >= Math.min(titleWords.length, existingWords.length) * 0.6) {
        const similarity = Math.round((commonWords.length / Math.max(titleWords.length, existingWords.length)) * 100);
        if (similarity > 60) {
          similar.push({
            id: existing.id,
            title: existing.title,
            similarity,
            reason: `${commonWords.length} common words: ${commonWords.join(', ')}`
          });
        }
      }
    }
    
    // If we found duplicates with simple check, return immediately
    if (similar.length > 0) {
      const isDuplicate = similar.some(s => s.similarity >= 80);
      return {
        isDuplicate,
        similar: similar.sort((a, b) => b.similarity - a.similarity),
        suggestions: isDuplicate ? [
          'Change the project title to make it more unique',
          'Add specific location or technology details to differentiate',
          'Focus on a different aspect of the climate issue'
        ] : []
      };
    }
    
    // If no simple duplicates found and we have API key, try AI check
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey || existingProposals.length === 0) {
      return { isDuplicate: false, similar: [], suggestions: [] };
    }

    const prompt = `
Analyze if this NEW proposal is a duplicate or very similar to existing proposals:

NEW PROPOSAL:
Title: ${title}
Description: ${description}

EXISTING PROPOSALS:
${existingProposals.map((p, i) => `${i + 1}. ID: ${p.id}, Title: ${p.title}, Description: ${p.description.substring(0, 200)}`).join('\n')}

Respond in JSON format:
{
  "isDuplicate": <true if >80% similar to any existing proposal>,
  "similarProposals": [
    {
      "id": <proposal id>,
      "title": "<proposal title>",
      "similarity": <0-100 percentage>,
      "reason": "<why it's similar>"
    }
  ],
  "modifications": [
    "<suggestion 1 to make it unique>",
    "<suggestion 2 to differentiate it>"
  ]
}

Only include proposals with >60% similarity.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        }),
      }
    );

    if (!response.ok) {
      console.warn('AI duplicate check failed, using simple text matching only');
      return { isDuplicate: false, similar: [], suggestions: [] };
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiResponse) {
      return { isDuplicate: false, similar: [], suggestions: [] };
    }

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { isDuplicate: false, similar: [], suggestions: [] };
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      isDuplicate: result.isDuplicate || false,
      similar: result.similarProposals || [],
      suggestions: result.modifications || []
    };
  } catch (error) {
    console.error('Duplicate check error:', error);
    return { isDuplicate: false, similar: [], suggestions: [] };
  }
}
