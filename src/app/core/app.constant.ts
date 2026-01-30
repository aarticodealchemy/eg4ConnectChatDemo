import { SegmentOption } from "../models/app.model";

export const TAB_OPTIONS: SegmentOption[] = [
    { value: "home", label: "Home" },
    { value: "grid", label: "Grid" },
    { value: "solar", label: "Solar" },
    { value: "battery", label: "Battery" },
];

export const PERIOD_OPTIONS: SegmentOption[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "custom", label: "Custom" },
];