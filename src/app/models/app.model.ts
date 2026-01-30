import { GraphScale, TimeScale } from "../core/app.type";

export interface SegmentOption {
    value: string;
    label: string;
}

export interface GraphDataPoint {
  dateTime: string;
  scale: GraphScale;
  serialNumber: string;
  batteryToHome: number;
  solarToBattery: number;
  gridToBattery: number;
  genToBattery: number;
  solarToHome: number;
  gridToHome: number;
  generatorToHome: number;
  gridImported: number;
  batteryExported: number;
  solarExported: number;
}

export interface SimpleGraphParams {
  timeScale?: TimeScale;
  startDate?: number;
  endDate?: number;
}