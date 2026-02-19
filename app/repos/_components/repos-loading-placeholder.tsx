"use client";

import { Loader2Icon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useProjectLoading } from "./project-loading-context";

export function ReposLoadingPlaceholder() {
  const { isPending } = useProjectLoading();

  if (!isPending) return null;

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-6">
        <Loader2Icon className="text-muted-foreground size-5 shrink-0 animate-spin" />
        <p className="text-muted-foreground text-sm">Loading repositories…</p>
      </CardContent>
    </Card>
  );
}
