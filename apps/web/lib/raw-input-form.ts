export type CreateRawInputState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const createRawInputInitialState: CreateRawInputState = {
  status: "idle",
};
