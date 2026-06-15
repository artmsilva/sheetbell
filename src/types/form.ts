interface FormData {
  contact: string;
  organizer: string;
  date: string;
  message: string;
}

type FormStatus = "idle" | "submitting" | "success" | "error" | "celebrating";
type FormActionType =
  | "change"
  | "submit"
  | "success"
  | "error"
  | "reset"
  | "celebration_done";

interface FormState {
  status: FormStatus;
  formData: FormData;
  previousData: FormData | null;
  error: string | null;
}

interface FormAction {
  type: FormActionType;
  field?: string;
  value?: string;
  error?: string;
}

const FORM_STATUS = {
  IDLE: "idle" as FormStatus,
  SUBMITTING: "submitting" as FormStatus,
  SUCCESS: "success" as FormStatus,
  ERROR: "error" as FormStatus,
  CELEBRATING: "celebrating" as FormStatus,
};

const FORM_ACTION = {
  CHANGE: "change" as FormActionType,
  SUBMIT: "submit" as FormActionType,
  SUCCESS: "success" as FormActionType,
  ERROR: "error" as FormActionType,
  RESET: "reset" as FormActionType,
  CELEBRATION_DONE: "celebration_done" as FormActionType,
};

export type { FormData, FormState, FormAction, FormStatus, FormActionType };
export { FORM_STATUS, FORM_ACTION };
