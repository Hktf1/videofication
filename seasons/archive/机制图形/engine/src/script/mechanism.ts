export const MECHANISM_KINDS = ["门槛", "状态", "反馈"] as const;
export type MechanismKind = typeof MECHANISM_KINDS[number];
export type MechanismSpec = { kind: MechanismKind; stage?: string };

export const isMechanismStyle = (meta: Record<string, string>) => meta["风格"] === "v3";

