import { getMember } from "@/lib/auth";
import { csvResponse } from "@/lib/csv";
import { getActivities, getBatches, getProblems, getProducts, getToday } from "@/lib/data";
import { diffDays, formatTime } from "@/lib/dates";
import { describeActivity } from "@/lib/describe";
import { ENTRY_META, OUTCOME_META } from "@/lib/entry-meta";

export async function GET() {
  if (!(await getMember())) return new Response("Please log in", { status: 401 });
  const [today, problems, activities, products, batches] = await Promise.all([
    getToday(),
    getProblems(),
    getActivities(),
    getProducts(),
    getBatches(),
  ]);

  const rows = [...problems].reverse().map((p) => {
    const linked = activities.filter((a) => a.problemId === p.id);
    const steps = [
      ...p.updates.map((u) => ({ at: u.occurredAt, text: `${u.kind === "action" ? "Action: " : ""}${u.body}` })),
      ...linked.map((a) => {
        const d = describeActivity(a, products);
        return { at: a.occurredAt, text: `${ENTRY_META[a.type].label}: ${d.title}, ${d.detail}` };
      }),
    ]
      .sort((a, z) => a.at.localeCompare(z.at))
      .map((s) => `${s.at.slice(0, 10)} ${formatTime(s.at)} ${s.text}`)
      .join("\n");
    return [
      p.foundOn,
      p.title,
      p.status === "open" ? "Open" : "Closed",
      p.outcome ? OUTCOME_META[p.outcome].label : "",
      p.resolvedOn,
      diffDays(p.resolvedOn ?? today, p.foundOn),
      p.causeKind,
      p.suspectedCause,
      p.affectedPart,
      p.severity,
      p.symptoms,
      p.tags.join(", "),
      p.lesson,
      steps,
      batches.find((b) => b.batch.id === p.batchId)?.batch.name,
    ];
  });

  return csvResponse(
    `kebun-cili-problems-${today}.csv`,
    [
      "Found", "Title", "Status", "Result", "Closed", "Days", "Cause type", "Suspected cause", "Affected part",
      "Severity", "Symptoms", "Tags", "Lesson", "What was done", "Batch",
    ],
    rows,
  );
}
