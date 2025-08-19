import React, { useState, useEffect, useRef } from "react";
import { MultiStepLoader } from "../../components/ui/multi-step-loader";

const loadingStates = [
  { text: "Setting up environment" },
  { text: "Cloning your files" },
  { text: "Firing up the editor" },
];

export default function MultiStepLoaderScreen({ onComplete, username, repo }) {
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const hasCloned = useRef(false);

  useEffect(() => {
    if (!loading) return;
    let timeout;
    async function nextStep() {
      if (currentStep === 1 && !hasCloned.current) {
        // Clone repo files
        hasCloned.current = true;
        try {
          await fetch(`/api/clone-repo?owner=${username}&repo=${repo}`);
        } catch (e) {
          // Optionally handle error
        }
      }
      if (currentStep < loadingStates.length - 1) {
        timeout = setTimeout(() => setCurrentStep((s) => s + 1), 2000);
      } else {
        timeout = setTimeout(() => onComplete(), 2000);
      }
    }
    nextStep();
    return () => clearTimeout(timeout);
  }, [currentStep, loading, onComplete, username, repo]);

  return (
    <div className="w-full h-screen flex items-center justify-center">
      <MultiStepLoader loadingStates={loadingStates} loading={loading} duration={2000} value={currentStep} />
    </div>
  );
}
