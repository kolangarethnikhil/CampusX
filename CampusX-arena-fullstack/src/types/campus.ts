import type { Timestamp } from "firebase/firestore";

export interface Campus {
  id: string;
  name: string;
  shortName: string;
  city: string;
  emailDomains: string[];
  active: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
