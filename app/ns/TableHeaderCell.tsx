"use client";
import type { ReactNode } from "react";

interface TableHeaderCellProps {
  children: ReactNode;
}

export default function TableHeaderCell({ children }: TableHeaderCellProps) {
  return <div className="flex items-center">{children}</div>;
}
