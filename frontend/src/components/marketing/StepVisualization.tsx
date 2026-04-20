"use client";

/**
 * src/components/marketing/StepVisualization.tsx
 *
 * Enhanced step cards with desktop gold gradient connectors.
 * Desktop: 5-column grid with connector lines between steps.
 * Mobile: stacked cards with no connectors.
 */

import React from "react";
import { StaggerCard } from "./StaggerCard";

interface Step {
  step: number;
  title: string;
  description: string;
  icon?: string;
}

interface StepVisualizationProps {
  steps: Step[];
  className?: string;
}

export function StepVisualization({
  steps,
  className = "",
}: StepVisualizationProps) {
  return (
    <div className={className}>
      {/* Desktop: grid with connectors */}
      <div className="hidden sm:grid" style={{
        gridTemplateColumns: steps
          .map((_, i) => (i < steps.length - 1 ? "1fr auto" : "1fr"))
          .join(" "),
        alignItems: "start",
        gap: "0",
      }}>
        {steps.map((step, i) => (
          <React.Fragment key={step.step}>
            <StaggerCard index={i}>
              <div className="group rounded-xl border border-slate-700/40 bg-slate-900/60 p-6 hover:-translate-y-1 hover:border-gold-400/30 transition-all duration-300">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-slate-950 font-display text-xl font-bold mx-auto">
                  {step.step}
                </div>
                {step.icon && (
                  <div className="text-center mb-2">
                    <i
                      className={`fa-solid ${step.icon} text-gold-400/60`}
                      aria-hidden="true"
                    />
                  </div>
                )}
                <h3 className="font-serif text-lg font-semibold text-parchment-50 mb-2 text-center">
                  {step.title}
                </h3>
                <p className="text-sm text-parchment-500 leading-relaxed text-center">
                  {step.description}
                </p>
              </div>
            </StaggerCard>
            {/* Connector line between steps */}
            {i < steps.length - 1 && (
              <div className="flex items-center justify-center self-center" style={{ height: "2px", minWidth: "32px" }}>
                <div
                  className="w-full h-0.5 bg-gradient-to-r from-gold-400/40 to-gold-400/40 animate-connector-draw"
                  aria-hidden="true"
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Mobile: stacked cards */}
      <div className="sm:hidden space-y-4">
        {steps.map((step, i) => (
          <StaggerCard key={step.step} index={i}>
            <div className="group rounded-xl border border-slate-700/40 bg-slate-900/60 p-6 hover:-translate-y-1 hover:border-gold-400/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-slate-950 font-display text-lg font-bold">
                  {step.step}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-parchment-50 mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-parchment-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          </StaggerCard>
        ))}
      </div>
    </div>
  );
}
