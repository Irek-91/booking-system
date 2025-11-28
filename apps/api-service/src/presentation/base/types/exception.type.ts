export type exceptionResponseType = {
  errorsMessages: Array<{
    message: string;
    field: string;
  }>;
};

export type exceptionObjectType = {
  message: string;
  field: string;
};

