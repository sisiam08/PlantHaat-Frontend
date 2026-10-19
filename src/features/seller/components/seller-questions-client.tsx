"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toastApiError } from "@/features/auth/components/error-toast";
import { qaApi, type QaQuestion } from "@/features/qa/api";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";

type Filter = "unanswered" | "all";

function AnswerBox({
  questionId,
  onDone,
}: {
  questionId: string;
  onDone: () => void;
}) {
  const t = useTranslations("seller.questions");
  const tErrors = useTranslations("errors");
  const [body, setBody] = useState("");
  const answer = useMutation({
    mutationFn: (text: string) => qaApi.answer(questionId, text),
    onSuccess: () => {
      setBody("");
      toast.success(t("answered"));
      onDone();
    },
    onError: (error) => toastApiError(error, tErrors),
  });
  return (
    <div className="grid gap-2">
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={t("answerPlaceholder")}
        rows={2}
      />
      <Button
        variant="cta"
        size="sm"
        className="w-fit"
        disabled={answer.isPending || body.trim().length === 0}
        onClick={() => answer.mutate(body.trim())}
      >
        {t("sendAnswer")}
      </Button>
    </div>
  );
}

function QuestionRow({ question, onChanged }: { question: QaQuestion & { product: { name: string; slug: string } }; onChanged: () => void }) {
  const t = useTranslations("seller.questions");
  const [open, setOpen] = useState(question.answerCount === 0);
  return (
    <Card className="rounded-2xl">
      <CardContent className="grid gap-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={`/products/${question.product.slug}`} className="font-medium hover:underline">
            {question.product.name}
          </Link>
          <span className="text-xs text-muted-foreground">
            {formatLatinDateTime(question.createdAt)}
          </span>
        </div>
        <p className="whitespace-pre-wrap">{question.body}</p>
        <div className="flex flex-wrap items-center gap-2">
          {question.answerCount > 0 ? (
            <Badge variant="secondary" className="rounded-full">
              {t("answerCount", { count: question.answerCount })}
            </Badge>
          ) : (
            <Badge variant="destructive" className="rounded-full">
              {t("unanswered")}
            </Badge>
          )}
          <Button variant="outline" size="sm" className="ms-auto" onClick={() => setOpen((v) => !v)}>
            {t("answer")}
          </Button>
        </div>
        {open ? <AnswerBox questionId={question.id} onDone={onChanged} /> : null}
      </CardContent>
    </Card>
  );
}

export function SellerQuestionsClient() {
  const t = useTranslations("seller.questions");
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("unanswered");

  const query = useInfiniteQuery({
    queryKey: [...queryKeys.qa.questions("seller"), filter],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => qaApi.sellerQuestions({ status: filter, cursor: pageParam, limit: 10 }),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
    staleTime: 30_000,
  });

  const questions = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.data),
    [query.data],
  );

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.qa.questions("seller") });
    void queryClient.invalidateQueries({ queryKey: queryKeys.seller.dashboard });
  };

  return (
    <div className="grid gap-4">
      <div className="flex gap-1.5">
        {(["unanswered", "all"] as Filter[]).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              filter === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 bg-background hover:bg-muted",
            )}
          >
            {t(value === "unanswered" ? "filterUnanswered" : "filterAll")}
          </button>
        ))}
      </div>

      {query.isLoading ? <Skeleton className="h-32 w-full rounded-2xl" /> : null}
      {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!query.isLoading && questions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : null}

      <div className="grid gap-3">
        {questions.map((question) => (
          <QuestionRow key={question.id} question={question} onChanged={refresh} />
        ))}
      </div>

      {query.hasNextPage ? (
        <Button
          variant="outline"
          className="mx-auto"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("loadMore")}
        </Button>
      ) : null}
    </div>
  );
}
