"use client";

import { useState, useId } from "react";
import { Loader2Icon, CheckIcon, ChevronRightIcon, SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import { useProjectLoading } from "./project-loading-context";

export type ProjectListItem = Readonly<{
  id: string;
  name: string;
  href: string;
}>;

type ProjectListProps = Readonly<{
  items: ProjectListItem[];
  selectedProject: string;
}>;

export function ProjectList({ items, selectedProject }: ProjectListProps) {
  const [query, setQuery] = useState("");
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const inputId = useId();
  const { isPending, navigateToProject } = useProjectLoading();

  const lower = query.trim().toLowerCase();
  const filtered = lower === "" ? items : items.filter((p) => p.name.toLowerCase().includes(lower));

  return (
    <div className="flex flex-col gap-4">
      <Label htmlFor={inputId} className="sr-only">
        Filter projects
      </Label>

      <div className="relative">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter projects…"
          className="pl-9"
          autoComplete="off"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">No matching projects.</p>
      ) : (
        <ul aria-label="Projects" className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
          {filtered.map((p) => {
            const isSelected = p.name === selectedProject;
            const isLoading = isPending && activeHref === p.href;

            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-current={isSelected ? true : undefined}
                  onClick={() => {
                    setActiveHref(p.href);
                    navigateToProject(p.href);
                  }}
                  className={cn(
                    "flex h-10 w-full items-center justify-between gap-3 rounded-md border px-3 text-sm font-medium transition-colors",
                    isSelected
                      ? "border-primary/30 bg-primary/8 text-primary"
                      : "border-border/60 text-foreground hover:border-border hover:bg-accent hover:text-accent-foreground bg-transparent",
                  )}
                >
                  <span className="truncate">{p.name}</span>
                  {isLoading ? (
                    <Loader2Icon className="text-muted-foreground size-4 shrink-0 animate-spin" />
                  ) : isSelected ? (
                    <CheckIcon className="text-primary size-4 shrink-0" />
                  ) : (
                    <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
