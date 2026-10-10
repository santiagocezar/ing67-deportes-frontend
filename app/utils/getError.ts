import { type ErrorResponse } from "~/utils/openapi";

export function getError(err: unknown) {
	return (err as { data: ErrorResponse }).data.error.message;
}
