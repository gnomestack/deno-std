export interface IError extends IInnerError {
    readonly message?: string;

    readonly target?: string;

    details?: IError[];
}

export interface IInnerError extends Record<string, unknown> {
    readonly code?: string;

    readonly innerError?: IInnerError;
}
