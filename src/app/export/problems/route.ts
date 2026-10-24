import { csvResponse } from "@/lib/csv";
import { costOf, getActivities, getProblems, getProducts, getToday } from "@/lib/data";
import { diffDays, formatTime } from "@/lib/dates";
import { describeActivity } from "@/lib/describe";
import { OUTCOME_META } from "@/lib/entry-meta";

export async function GET() {
  const [today, problems, activities, products] = await Promise.all([
    getToday(),
    getProblems(),
    getActivities(),
    getProducts(),
  ]);

  const rows = [...problems].reverse().map((p) => {
    const linked = activities.filter((a) => a.problemId === p.id);
    const steps = [
      ...p.updates.map((u) => ({ at: u.occurredAt, text: `${u.kind === "action" ? "Action: " : ""}${u.body}` })),
      ...linked.map((a) => {
        const d = describeActivity(a, products);
        return { at: a.occurredAt, text: `${a.type === "spray" ? "Spray" : "Baja"}: ${d.title}, ${d.detail}` };
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
      linked.reduce((s, a) => s + costOf(a), 0).toFixed(2),
    ];
  });

  return csvResponse(
    `kebun-cili-problems-${today}.csv`,
    [
      "Found", "Title", "Status", "Result", "Closed", "Days", "Cause type", "Suspected cause", "Affected part",
      "Severity", "Symptoms", "Tags", "Lesson", "What was done", "Spent (RM)",
    ],
    rows,
  );
}
