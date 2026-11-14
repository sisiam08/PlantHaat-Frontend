"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircleQuestion, Star, Trash2, Pencil, Flag } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toastApiError } from "@/features/auth/components/error-toast";
import { useAuth } from "@/features/auth/auth-provider";
import { ProductLightbox } from "@/features/catalog/components/product-lightbox";
import { StarRating } from "@/features/catalog/components/product-card";
import { qaApi, type QaAnswer, type QaPage, type QaQuestion, type QaReply } from "@/features/qa/api";
import { reviewsApi, type ReviewView } from "@/features/reviews/api";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { formatCount } from "@/lib/format/number";

type Tab = "reviews" | "qa";

function AuthorName({ author }: { author: { name: string | null; deleted: boolean } }) {
  const t = useTranslations("engagement");
  return (
    <span className={cn("font-medium", author.deleted && "text-muted-foreground")}>
      {author.deleted || !author.name ? t("deletedUser") : author.name}
    </span>
  );
}

function AuthorBadges({
  isSeller,
  isAdmin,
  verified,
}: {
  isSeller?: boolean;
  isAdmin?: boolean;
  verified?: boolean;
}) {
  const t = useTranslations("engagement");
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {isSeller ? (
        <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
          {t("sellerBadge")}
        </Badge>
      ) : null}
      {isAdmin ? (
        <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
          {t("adminBadge")}
        </Badge>
      ) : null}
      {verified ? (
        <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
          {t("verifiedBuyer")}
        </Badge>
      ) : null}
    </span>
  );
}

function ReportButton({ kind, id }: { kind: "questions" | "answers" | "replies" | "reviews"; id: string }) {
  const t = useTranslations("engagement");
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={async () => {
        const reason = window.prompt(t("reportPrompt"));
        if (!reason || reason.trim().length < 3) return;
        setPending(true);
        try {
          await qaApi.report(kind, id, reason.trim());
          toast.success(t("reported"));
        } catch {
          toast.error(t("reportFailed"));
        } finally {
          setPending(false);
        }
      }}
    >
      <Flag aria-hidden className="size-3.5" />
      {t("report")}
    </Button>
  );
}

function InlineEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (body: string) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations("engagement");
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);
  return (
    <div className="grid gap-2">
      <Textarea value={value} onChange={(event) => setValue(event.target.value)} rows={3} />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="cta"
          disabled={pending || value.trim().length === 0}
          onClick={async () => {
            setPending(true);
            try {
              await onSave(value.trim());
            } finally {
              setPending(false);
            }
          }}
        >
          {t("save")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}

/* ── Review replies ─────────────────────────────────────────────── */

export function ReviewReplies({ reviewId, sellerReply }: { reviewId: string; sellerReply: string | null }) {
  const t = useTranslations("engagement");
  const { user } = useAuth();
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const query = useQuery({
    queryKey: queryKeys.qa.reviewReplies(reviewId),
    queryFn: () => qaApi.reviewReplies(reviewId, null, 20),
  });

  const reply = useMutation({
    mutationFn: (text: string) => qaApi.replyToReview(reviewId, text),
    onSuccess: (created) => {
      queryClient.setQueryData<QaPage<QaReply>>(queryKeys.qa.reviewReplies(reviewId), (old) =>
        old ? { ...old, data: [...old.data, created] } : old,
      );
      setBody("");
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const replies = query.data?.data ?? [];
  const showLegacy = replies.length === 0 && sellerReply;

  return (
    <div className="grid gap-2 border-t border-border/50 pt-2">
      {showLegacy ? (
        <p className="rounded-lg bg-muted/40 p-2 text-xs">
          <span className="font-medium">{t("sellerBadge")}: </span>
          {sellerReply}
        </p>
      ) : null}
      {replies.map((item) => (
        <div key={item.id} className="rounded-lg bg-muted/40 p-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <AuthorName author={item.author} />
            <AuthorBadges isSeller={item.isSellerReply} />
            <span className="text-muted-foreground">{formatLatinDateTime(item.createdAt)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap">{item.body}</p>
        </div>
      ))}
      {user ? (
        <div className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t("replyPlaceholder")}
            rows={1}
            className="min-h-9 flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={reply.isPending || body.trim().length === 0}
            onClick={() => reply.mutate(body.trim())}
          >
            {t("send")}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("loginToReply")}</p>
      )}
    </div>
  );
}
function ReviewCard({ review }: { review: ReviewView }) {
  const t = useTranslations("engagement");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const images = review.images ?? [];
  return (
    <article className="grid gap-2 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <AuthorName author={{ name: review.customer.name, deleted: review.customer.deleted ?? false }} />
          <AuthorBadges verified />
          <span className="text-xs text-muted-foreground">{formatLatinDateTime(review.createdAt)}</span>
        </div>
        <StarRating value={review.rating} />
      </div>
      {review.title ? <p className="font-medium">{review.title}</p> : null}
      {review.comment ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {review.comment}
        </p>
      ) : null}
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setLightbox(index)}
              className="relative size-16 overflow-hidden rounded-lg ring-1 ring-border/40"
              aria-label={t("openPhoto")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      <ReviewReplies reviewId={review.id} sellerReply={review.sellerReply} />
      <div className="flex justify-end">
        <ReportButton kind="reviews" id={review.id} />
      </div>
      {lightbox !== null ? (
        <ProductLightbox
          slides={images.map((image) => ({ src: image.url }))}
          index={lightbox}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </article>
  );
}

function ReviewsPanel({ slug }: { slug: string }) {
  const t = useTranslations("engagement");
  const [sort, setSort] = useState<"newest" | "highest" | "lowest">("newest");
  const [rating, setRating] = useState<number | undefined>();
  const [withPhotos, setWithPhotos] = useState(false);

  const query = useInfiniteQuery({
    queryKey: [...queryKeys.catalog.productReviews(slug), sort, rating ?? 0, withPhotos],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      reviewsApi.forProduct(slug, {
        cursor: pageParam,
        sort,
        rating,
        withPhotos: withPhotos || undefined,
      }),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
    staleTime: 60_000,
  });

  const reviews = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.data),
    [query.data],
  );
  const meta = query.data?.pages[0]?.meta;
  const average = meta?.average ?? 0;
  const distribution = meta?.distribution ?? {};
  const total = meta?.total ?? reviews.length;

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-2xl border border-border/60 bg-secondary/30 p-4 sm:grid-cols-[auto_1fr] sm:p-5">
        <div className="grid place-items-center gap-1 text-center">
          <p className="font-heading text-4xl font-bold">{average.toFixed(1)}</p>
          <StarRating value={average} />
          <p className="text-xs text-muted-foreground">{t("basedOn", { count: total })}</p>
        </div>
        <div className="grid gap-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[String(star)] ?? 0;
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <button
                key={star}
                type="button"
                aria-pressed={rating === star}
                onClick={() => setRating(rating === star ? undefined : star)}
                className="flex min-h-7 items-center gap-2 rounded-md px-1 py-0.5 text-xs"
              >
                <span className="w-10 shrink-0 text-left text-muted-foreground">
                  {t("stars", { count: star })}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-cta"
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="w-8 text-right tabular-nums text-muted-foreground">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterPill active={!rating && !withPhotos} onClick={() => { setRating(undefined); setWithPhotos(false); }}>
          {t("allReviews")}
        </FilterPill>
        <FilterPill active={withPhotos} onClick={() => setWithPhotos((v) => !v)}>
          {t("withPhotos")}
        </FilterPill>
        <select
          aria-label={t("sort")}
          value={sort}
          onChange={(event) => setSort(event.target.value as "newest" | "highest" | "lowest")}
          className="ml-auto h-9 rounded-full border border-input bg-background px-3 text-sm"
        >
          <option value="newest">{t("sortNewest")}</option>
          <option value="highest">{t("sortHighest")}</option>
          <option value="lowest">{t("sortLowest")}</option>
        </select>
      </div>

      {query.isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          {t("noReviews")}
        </p>
      ) : (
        <div className="grid gap-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

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

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/60 bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/* ── Q&A ────────────────────────────────────────────────────────── */

function ReplyBox({
  placeholder,
  onSubmit,
}: {
  placeholder: string;
  onSubmit: (body: string) => Promise<void>;
}) {
  const t = useTranslations("engagement");
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        rows={1}
        className="min-h-9 flex-1"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={pending || value.trim().length === 0}
        onClick={async () => {
          setPending(true);
          try {
            await onSubmit(value.trim());
            setValue("");
          } finally {
            setPending(false);
          }
        }}
      >
        {t("send")}
      </Button>
    </div>
  );
}

function AnswerCard({
  answer,
  onChanged,
}: {
  answer: QaAnswer;
  onChanged: () => void;
}) {
  const t = useTranslations("engagement");
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const isMine = user?.id === answer.author.id;

  return (
    <div className="grid gap-2 rounded-xl bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <AuthorName author={answer.author} />
          <AuthorBadges isSeller={answer.isSellerAnswer} />
          <span className="text-xs text-muted-foreground">{formatLatinDateTime(answer.createdAt)}</span>
        </div>
        {isMine ? (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
              <Pencil aria-hidden className="size-3.5" />
              {t("edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (!window.confirm(t("deleteConfirm"))) return;
                await qaApi.deleteAnswer(answer.id);
                toast.success(t("deleted"));
                onChanged();
              }}
            >
              <Trash2 aria-hidden className="size-3.5" />
              {t("delete")}
            </Button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <InlineEditor
          initial={answer.body}
          onCancel={() => setEditing(false)}
          onSave={async (body) => {
            await qaApi.updateAnswer(answer.id, body);
            setEditing(false);
            toast.success(t("saved"));
            onChanged();
          }}
        />
      ) : (
        <p className="text-sm whitespace-pre-wrap">{answer.body}</p>
      )}

      {answer.replies.map((reply) => (
        <div key={reply.id} className="ml-3 rounded-lg bg-background/70 p-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <AuthorName author={reply.author} />
            <AuthorBadges isSeller={reply.isSellerReply} />
            <span className="text-muted-foreground">{formatLatinDateTime(reply.createdAt)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap">{reply.body}</p>
        </div>
      ))}

      <div className="flex items-center justify-between gap-2">
        {user ? (
          <div className="flex-1">
            <ReplyBox
              placeholder={t("replyPlaceholder")}
              onSubmit={async (body) => {
                await qaApi.replyToAnswer(answer.id, body);
                toast.success(t("replySent"));
                onChanged();
              }}
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("loginToReply")}</p>
        )}
        <ReportButton kind="answers" id={answer.id} />
      </div>
    </div>
  );
}

function QuestionCard({ question, onChanged }: { question: QaQuestion; onChanged: () => void }) {
  const t = useTranslations("engagement");
  const { user } = useAuth();
  const tErrors = useTranslations("errors");
  const [answering, setAnswering] = useState(false);
  const [editing, setEditing] = useState(false);
  const isMine = user?.id === question.author.id;

  return (
    <article id={`question-${question.id}`} className="grid gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <AuthorName author={question.author} />
          <span className="text-xs text-muted-foreground">{formatLatinDateTime(question.createdAt)}</span>
          <Badge variant="secondary" className="rounded-full text-xs">
            {t("answerCount", { count: question.answerCount })}
          </Badge>
        </div>
        {isMine ? (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
              <Pencil aria-hidden className="size-3.5" />
              {t("edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (!window.confirm(t("deleteConfirm"))) return;
                try {
                  await qaApi.deleteQuestion(question.id);
                  toast.success(t("deleted"));
                  onChanged();
                } catch (error) {
                  toastApiError(error, tErrors);
                }
              }}
            >
              <Trash2 aria-hidden className="size-3.5" />
              {t("delete")}
            </Button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <InlineEditor
          initial={question.body}
          onCancel={() => setEditing(false)}
          onSave={async (body) => {
            await qaApi.updateQuestion(question.id, body);
            setEditing(false);
            toast.success(t("saved"));
            onChanged();
          }}
        />
      ) : (
        <p className="text-sm font-medium whitespace-pre-wrap">{question.body}</p>
      )}

      {question.answers.length > 0 ? (
        <div className="grid gap-2">
          {question.answers.map((answer) => (
            <AnswerCard key={answer.id} answer={answer} onChanged={onChanged} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("unanswered")}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2">
        {user ? (
          answering ? (
            <div className="w-full">
              <ReplyBox
                placeholder={t("answerPlaceholder")}
                onSubmit={async (body) => {
                  await qaApi.answer(question.id, body);
                  setAnswering(false);
                  toast.success(t("answerSent"));
                  onChanged();
                }}
              />
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAnswering(true)}>
              <MessageCircleQuestion aria-hidden className="size-4" />
              {t("answer")}
            </Button>
          )
        ) : (
          <p className="text-xs text-muted-foreground">{t("loginToAnswer")}</p>
        )}
        <ReportButton kind="questions" id={question.id} />
      </div>
    </article>
  );
}

function QaPanel({ slug, productId }: { slug: string; productId: string }) {
  const t = useTranslations("engagement");
  const tErrors = useTranslations("errors");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const locale = useLocale();
  const [body, setBody] = useState("");

  const query = useInfiniteQuery({
    queryKey: queryKeys.qa.questions(slug),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => qaApi.questions(slug, pageParam, 5),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined),
    staleTime: 60_000,
  });

  const ask = useMutation({
    mutationFn: (text: string) => qaApi.question(productId, text),
    onSuccess: () => {
      setBody("");
      toast.success(t("questionSent"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.qa.questions(slug) });
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const questions = useMemo(
    () => (query.data?.pages ?? []).flatMap((page) => page.data),
    [query.data],
  );
  const total = query.data?.pages[0]?.meta.total ?? questions.length;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.qa.questions(slug) });
  };

  return (
    <div className="grid gap-5">
      {user ? (
        <div className="grid gap-2 rounded-2xl border border-border/60 bg-secondary/30 p-4">
          <p className="font-medium">{t("askTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("askHint")}</p>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t("askPlaceholder")}
            rows={3}
            maxLength={1000}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {t("charCount", { count: body.trim().length })}
            </span>
            <Button
              variant="cta"
              disabled={ask.isPending || body.trim().length < 10}
              onClick={() => ask.mutate(body.trim())}
            >
              {ask.isPending ? t("sending") : t("ask")}
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          {t("loginToAsk")}
        </p>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("questionsTitle")}</h3>
        <span className="text-sm text-muted-foreground">{formatCount(total, locale)}</span>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : questions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          {t("noQuestions")}
        </p>
      ) : (
        <div className="grid gap-3">
          {questions.map((question) => (
            <QuestionCard key={question.id} question={question} onChanged={refresh} />
          ))}
        </div>
      )}

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

/* ── Shell with segmented control ──────────────────────────────── */

export function ProductEngagement({
  slug,
  productId,
  reviewCount,
  questionCount,
}: {
  slug: string;
  productId: string;
  reviewCount: number;
  questionCount: number;
}) {
  const t = useTranslations("engagement");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial: Tab = searchParams.get("tab") === "qa" ? "qa" : "reviews";
  const [tab, setTab] = useState<Tab>(initial);
  const tablistRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash !== "#qa" && hash !== "#reviews") return;
    const next: Tab = hash === "#qa" ? "qa" : "reviews";
    // Defer so this is a state update from an external event, not an effect cascade.
    const timer = window.setTimeout(() => setTab(next), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const select = (next: Tab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "qa") params.set("tab", "qa");
    else params.delete("tab");
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}#${next === "qa" ? "qa" : "reviews"}`, {
      scroll: false,
    });
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: Tab = tab === "reviews" ? "qa" : "reviews";
    select(next);
    const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next === "reviews" ? 0 : 1]?.focus();
  };

  const tabs: { value: Tab; label: string; count: number; icon: typeof Star }[] = [
    { value: "reviews", label: t("reviewsTab", { count: reviewCount }), count: reviewCount, icon: Star },
    { value: "qa", label: t("qaTab", { count: questionCount }), count: questionCount, icon: MessageCircleQuestion },
  ];

  return (
    <section id="reviews" className="scroll-mt-28">
      <div
        ref={tablistRef}
        role="tablist"
        aria-label={t("tabsLabel")}
        onKeyDown={onKeyDown}
        className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-border/60 bg-secondary/40 p-1"
      >
        {tabs.map((item, index) => {
          const Icon = item.icon;
          const selected = tab === item.value;
          return (
            <button
              key={item.value}
              role="tab"
              id={`tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(item.value)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:text-base",
                selected
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {item.label}
              <span className="sr-only">{index + 1}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
        className="focus-visible:outline-none"
      >
        {tab === "reviews" ? <ReviewsPanel slug={slug} /> : <QaPanel slug={slug} productId={productId} />}
      </div>
    </section>
  );
}

