import { NextResponse } from "next/server";
import { getSession } from "@/lib/translate-auth";
import {
  getGlobalSettings,
  getRoles,
  getLearningExamples,
  getRoleHistory,
  findUserById
} from "@/lib/translate-store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: true, data: null });
  }
  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ ok: true, data: null });
  }
  const [settings, roles] = await Promise.all([
    getGlobalSettings(session.userId),
    getRoles(session.userId)
  ]);
  const rolesWithCount = await Promise.all(
    roles.map(async (r) => {
      const [examples, history] = await Promise.all([
        getLearningExamples(session.userId, r.id),
        getRoleHistory(session.userId, r.id)
      ]);
      return { ...r, learningCount: examples.length, historyCount: history.length };
    })
  );
  return NextResponse.json({
    ok: true,
    data: {
      user: { id: user.id, email: user.email },
      settings,
      roles: rolesWithCount
    }
  });
}
