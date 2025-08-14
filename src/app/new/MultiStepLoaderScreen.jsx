import React, { useState } from "react";
import { MultiStepLoader } from "../../components/ui/multi-step-loader";

const loadingStates = [
  { text: "Setting up environment" },
  { text: "Cloning your files" },
  { text: "Firing up the editor" },
];

export default function MultiStepLoaderScreen({ onComplete }) {
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoading(false);
        onComplete();
      }, loadingStates.length * 2000 + 500); // duration per step + buffer
      return () => clearTimeout(timeout);
    }
  }, [loading, onComplete]);

  return (
    <div className="w-full h-screen flex items-center justify-center">
  <MultiStepLoader loadingStates={loadingStates} loading={loading} duration={2000} />
    </div>
  );
}
