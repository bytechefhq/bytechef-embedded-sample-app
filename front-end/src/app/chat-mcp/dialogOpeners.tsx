"use client";

import { useEffect, useRef } from "react";
import { useActivationDialog, useConnectDialog } from "@bytechef/embedded";

import { BYTECHEF_APP_BASE_URL, BYTECHEF_ENVIRONMENT } from "@/lib/config";

type ActivationDialogOpenerProps = {
  jwtToken: string;
  onDone: () => void;
  workflowTemplateId: string;
};

// Opens the SDK activation dialog once and reports back when it closes, whether the user activated or cancelled.
export function ActivationDialogOpener({ jwtToken, onDone, workflowTemplateId }: ActivationDialogOpenerProps) {
  // StrictMode runs effects twice; open once and let the hook tear the dialog down on unmount.
  const openedRef = useRef(false);

  const { openDialog } = useActivationDialog({
    baseUrl: BYTECHEF_APP_BASE_URL,
    environment: BYTECHEF_ENVIRONMENT,
    jwtToken,
    onClose: onDone,
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

type ConnectDialogOpenerProps = {
  integrationId: string;
  jwtToken: string;
  onDone: () => void;
};

// Opens the SDK connect dialog. The hook has no close callback, so watch its portal and report back once it empties.
export function ConnectDialogOpener({ integrationId, jwtToken, onDone }: ConnectDialogOpenerProps) {
  const { closeDialog, openDialog } = useConnectDialog({
    baseUrl: BYTECHEF_APP_BASE_URL,
    environment: BYTECHEF_ENVIRONMENT,
    integrationId,
    jwtToken,
  });

  useEffect(() => {
    openDialog();

    const observer = new MutationObserver(() => {
      const portal = document.getElementById("connect-dialog-portal");

      if (portal && portal.childNodes.length === 0) {
        onDone();
      }
    });

    const portal = document.getElementById("connect-dialog-portal");

    if (portal) {
      observer.observe(portal, { childList: true });
    }

    return () => {
      observer.disconnect();
      closeDialog();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
