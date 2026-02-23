"use client";

import { useState, useEffect, useRef, useId } from "react";
import { RefreshCwIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { reposListUrl } from "@/app/repos/_lib/routes";
import { REPOS_SORT_ORDER } from "@/app/repos/_lib/sort";
import { useReposFilterLoading } from "./repos-filter-loading-context";

const DEBOUNCE_MS = 400;

type ReposFilterFormProps = Readonly<{
  decodedOrg: string;
  decodedProject: string;
  initialQ: string;
  initialOrder: string;
  initialHasRules: boolean;
}>;

export function ReposFilterForm({
  decodedOrg,
  decodedProject,
  initialQ,
  initialOrder,
  initialHasRules,
}: ReposFilterFormProps) {
  const { isPending, isRefreshing, navigateToRepos, refreshRepos } = useReposFilterLoading();

  const searchId = useId();
  const orderId = useId();
  const hasRulesId = useId();

  const [inputValue, setInputValue] = useState(initialQ);
  const [order, setOrder] = useState(initialOrder);
  const [hasRules, setHasRules] = useState(initialHasRules);

  // Fix #3: Sync local state when props change (browser back/forward)
  useEffect(() => setInputValue(initialQ), [initialQ]);
  useEffect(() => setOrder(initialOrder), [initialOrder]);
  useEffect(() => setHasRules(initialHasRules), [initialHasRules]);

  // Fix #1: Ref holds latest filter values so the debounce callback never
  // captures stale order/hasRules from a previous render's closure.
  const filterStateRef = useRef({ order, hasRules });

  useEffect(() => {
    filterStateRef.current = { order, hasRules };
  });

  // Fix #2: Shared timer ref so immediate handlers can cancel pending debounce.
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  // Derived from committed URL state (initial props), not local controlled state,
  // so the reset button appears/disappears in sync with the actual URL.
  const isFiltered = initialQ !== "" || initialOrder !== REPOS_SORT_ORDER.Asc || initialHasRules;
  const resetUrl = reposListUrl({ org: decodedOrg, project: decodedProject });

  function buildFilterUrl(overrides: { q?: string; order?: string; hasRules?: boolean }) {
    const current = filterStateRef.current;

    return reposListUrl({
      org: decodedOrg,
      project: decodedProject,
      q: ("q" in overrides ? overrides.q : inputValue) || undefined,
      order: overrides.order ?? current.order,
      hasRules: ("hasRules" in overrides ? overrides.hasRules : current.hasRules) || undefined,
    });
  }

  // Debounce text input → URL navigation
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    // Skip navigation when the change came from a prop sync (back/forward)
    if (inputValue === initialQ) return;

    debounceTimerRef.current = setTimeout(() => {
      navigateToRepos(buildFilterUrl({ q: inputValue }));
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // inputValue is the only trigger; filterStateRef is read inside the callback
    // to avoid stale closures. navigateToRepos is stable (useCallback-memoized).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  function handleOrderChange(newOrder: string) {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setOrder(newOrder);
    navigateToRepos(buildFilterUrl({ order: newOrder }));
  }

  function handleHasRulesChange(checked: boolean) {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setHasRules(checked);
    navigateToRepos(buildFilterUrl({ hasRules: checked }));
  }

  return (
    <TooltipProvider>
      <div className="flex items-start gap-2">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-5">
          <div className="sm:col-span-3">
            <Label htmlFor={searchId} className="sr-only">
              Search
            </Label>

            <Input
              id={searchId}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search repositories…"
              disabled={isPending}
            />
          </div>

          <div className="sm:col-span-1">
            <Label htmlFor={orderId} className="sr-only">
              Sort
            </Label>

            <Select value={order} onValueChange={handleOrderChange} disabled={isPending}>
              <SelectTrigger id={orderId} className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value={REPOS_SORT_ORDER.Asc}>A → Z</SelectItem>
                <SelectItem value={REPOS_SORT_ORDER.Desc}>Z → A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-input bg-background flex items-center gap-2 rounded-md border px-3 text-sm shadow-xs sm:col-span-1">
            <Checkbox
              id={hasRulesId}
              checked={hasRules}
              disabled={isPending}
              onCheckedChange={(v) => handleHasRulesChange(v === true)}
            />

            <Label htmlFor={hasRulesId} className="cursor-pointer">
              Has rules
            </Label>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Refresh results"
                disabled={isPending}
                onClick={refreshRepos}
              >
                <RefreshCwIcon className={isRefreshing ? "animate-spin" : undefined} />
              </Button>
            </TooltipTrigger>

            <TooltipContent>Refresh results</TooltipContent>
          </Tooltip>

          {isFiltered ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Reset filters"
                  disabled={isPending}
                  onClick={() => navigateToRepos(resetUrl)}
                >
                  <XIcon />
                </Button>
              </TooltipTrigger>

              <TooltipContent>Reset filters</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>
    </TooltipProvider>
  );
}
