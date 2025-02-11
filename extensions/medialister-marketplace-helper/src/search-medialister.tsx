import React, { useState, useEffect } from "react";
import { ActionPanel, Action, Form, showToast, Toast, Detail, AI, Clipboard, open, LocalStorage } from "@raycast/api";
import { defaultPrompt } from "./prompt";

// Create a new component for the initial screen
function AccountVerification({ onNext }: { onNext: () => void }): React.JSX.Element {
  const handleNext = async () => {
    // Save the verification status when user clicks Next
    await LocalStorage.setItem("hasVerifiedAccount", "true");
    onNext();
  };

  return (
    <Detail
      markdown={`# Do You Have an Account on Medialister?

If you don't have an account on Medialister yet, [sign up](https://app.medialister.com/sign-up/?utm_source=raycast&utm_medium=extension&utm_campaign=referral
) first to use this extension.`}
      actions={
        <ActionPanel>
          <Action title="Next" onAction={handleNext} />
          <Action.OpenInBrowser
            title="Sign Up"
            url={`https://app.medialister.com/sign-up/?utm_source=raycast&utm_medium=extension&utm_campaign=referral`}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    />
  );
}

// Your existing form component (renamed for clarity)
function LinkGenerator(): React.JSX.Element {
  const [parametersDescription, setParametersDescription] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [extractedUrl, setExtractedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved productDescription when component mounts
  useEffect(() => {
    const loadSavedDescription = async () => {
      try {
        const savedDescription = await LocalStorage.getItem("savedProductDescription");
        if (savedDescription && typeof savedDescription === "string") {
          setProductDescription(savedDescription);
        }
      } finally {
        setIsLoading(false); // Set loading to false after we've loaded the data
      }
    };
    loadSavedDescription();
  }, []);

  // Save productDescription whenever it changes
  const handleProductDescriptionChange = async (newValue: string) => {
    if (newValue) {
      setProductDescription(newValue);
      await LocalStorage.setItem("savedProductDescription", newValue);
    }
  };

  const handleSubmit = async () => {
    if (!productDescription) {
      showToast(Toast.Style.Failure, "Please provide details on what you would like to promote");
      return;
    }

    setIsLoading(true);
    try {
      const fullPrompt = `${defaultPrompt}

        ### What the User Wants to Promote
        ${productDescription}

        ### Specific Information on Where to Promote
        ${parametersDescription}`;
      const aiResponse = await AI.ask(fullPrompt, { model: AI.Model["OpenAI_GPT4o-mini"] });

      const urlRegex = /(https?:\/\/[^\s]+)/;
      const match = aiResponse.match(urlRegex);

      if (match) {
        Clipboard.copy(match[0]);
        showToast(Toast.Style.Success, "A link has been copied to the clipboard");
        open(match[0]);
        setExtractedUrl(match[0]);
      } else {
        showToast(Toast.Style.Failure, "No link was generated by some reason. Try again.");
      }
    } catch (error) {
      if (error instanceof Error) {
        showToast(Toast.Style.Failure, "An error occurred", error.message);
      } else {
        showToast(Toast.Style.Failure, "An error occurred", "Unknown error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (extractedUrl) {
    return (
      <Detail
        markdown={`# Use this link:\n\n[${extractedUrl}](${extractedUrl})`}
        actions={
          <ActionPanel>
            <Action title="Generate a New Link" onAction={() => setExtractedUrl(null)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Link" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="productDescription"
        title="What do you want to promote?"
        placeholder="What product, person, or company do you want to promote?"
        value={productDescription}
        onChange={handleProductDescriptionChange}
      />
      <Form.TextArea
        id="parametersDescription"
        title="What kind of media are you interested in?"
        placeholder="Specify the targeted geography, price per placement, media website metrics, such as Ahrefs Domain Rating, and other information."
        value={parametersDescription}
        onChange={setParametersDescription}
      />
    </Form>
  );
}

// Main component that manages the screen state
export default function AskRaycastAI(): React.JSX.Element {
  const [showGenerator, setShowGenerator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has already verified their account
    const checkVerificationStatus = async () => {
      try {
        const hasVerified = await LocalStorage.getItem("hasVerifiedAccount");
        if (hasVerified === "true") {
          setShowGenerator(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkVerificationStatus();
  }, []);

  if (isLoading) {
    return <Detail markdown="Loading..." />;
  }

  if (!showGenerator) {
    return <AccountVerification onNext={() => setShowGenerator(true)} />;
  }

  return <LinkGenerator />;
}
