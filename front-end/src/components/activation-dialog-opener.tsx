'use client';

import { useEffect, useRef } from "react";
import { useActivationDialog } from "@bytechef/embedded";
import { BYTECHEF_APP_BASE_URL, BYTECHEF_ENVIRONMENT } from "@/lib/config";

interface ActivationDialogOpenerProps {
  jwtToken: string;
  onActivated?: (workflowUuid: string) => void;
  onDone: () => void;
  onEditWorkflow?: (workflowUuid: string) => void;
  onSaved?: (workflowUuid: string) => void;
  workflowTemplateId: string;
}

// Opens the SDK's activation dialog as soon as it mounts. On a template the user has not activated yet the dialog
// activates it; on one they already activated it edits their connections and inputs and offers Save instead.
export function ActivationDialogOpener({
  jwtToken,
  onActivated,
  onDone,
  onEditWorkflow,
  onSaved,
  workflowTemplateId,
}: ActivationDialogOpenerProps) {
  // StrictMode mounts effects twice; open once, and let the hook tear the dialog down on unmount. Calling
  // closeDialog in a cleanup would fire onClose → onDone and unmount this opener before the dialog shows.
  const openedRef = useRef(false);

  const { openDialog } = useActivationDialog({
    baseUrl: BYTECHEF_APP_BASE_URL,
    environment: BYTECHEF_ENVIRONMENT,
    jwtToken,
    onActivated,
    onClose: onDone,
    onEditWorkflow,
    onSaved,
    workflowTemplateId,
  });

  useEffect(() => {
    if (openedRef.current) {
      return;
    }

    openedRef.current = true;

    openDialog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
