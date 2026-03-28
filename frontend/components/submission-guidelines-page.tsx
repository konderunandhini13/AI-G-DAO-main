"use client"

import { ArrowLeftIcon, LeafIcon, LightbulbIcon, CheckCircleIcon, FileTextIcon } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function SubmissionGuidelinesPage() {
  return (
    <div className="relative flex flex-col min-h-[100dvh] text-black overflow-hidden">
      {/* Blue/Black Gradient Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-black"></div>
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6">
        <Link
          href="/submit-proposal"
          className="flex items-center gap-2 text-black hover:text-gray-800 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Back to Submit Proposal</span>
        </Link>
        <div className="text-black font-bold text-lg">EcoNexus - Guidelines</div>
      </header>

      <main className="relative z-10 flex-1 px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-black">Proposal Submission Guidelines</h1>
            <p className="text-gray-800 text-lg max-w-2xl mx-auto">
              Ensure your project aligns with our core values of environmental protection and innovation.
            </p>
          </div>

          <Card className="bg-black/80 border-blue-500/50 backdrop-blur-sm shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-8 h-8 text-blue-400" />
              </div>
              <CardTitle className="text-2xl text-blue-400">Key Principles for Your Proposal</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 text-gray-300">
              {/* Environmental Impact */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
                  <LeafIcon className="w-6 h-6" />
                  Environmental Impact & Responsibility
                </h3>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Your project must not have destructive effects on the environment, ecosystems, or biodiversity.</li>
                  <li>Clearly explain how your project results in measurable environmental benefits — such as CO₂ reduction, water conservation, or habitat restoration.</li>
                  <li>Show how your project can sustain itself in the long run and scale beyond initial funding.</li>
                  <li>If relevant, explain how you ethically and sustainably source materials and resources.</li>
                </ul>
              </div>

              {/* Innovation & Feasibility */}
              <div className="space-y-4 pt-4">
                <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
                  <LightbulbIcon className="w-6 h-6" />
                  Innovation & Feasibility
                </h3>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Present a novel approach, method, or technology to solve climate-related challenges.</li>
                  <li>If your project involves tech, back it up with evidence — like prototypes, pilots, or solid research.</li>
                  <li>Clearly define measurable, achievable, and time-bound (SMART) goals for your project.</li>
                  <li>Describe your team's experience and qualifications relevant to project success.</li>
                </ul>
              </div>

              {/* General Submission */}
              <div className="space-y-4 pt-4">
                <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
                  <FileTextIcon className="w-6 h-6" />
                  General Submission Requirements
                </h3>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Ensure all form fields are properly completed.</li>
                  <li>Write your proposal in clear, simple terms. Avoid jargon or explain it clearly.</li>
                  <li>Optionally include detailed reports, case studies, or certifications to strengthen your submission.</li>
                  <li>Be transparent about your budget, timeline, and any project risks.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-800">
              Ready to make a difference?{" "}
              <Link href="/submit-proposal" className="text-black font-medium underline underline-offset-2">
                Submit your proposal now!
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-gray-800 text-sm">
        <p>&copy; {new Date().getFullYear()} EcoNexus. Empowering sustainable innovation.</p>
      </footer>
    </div>
  )
}
