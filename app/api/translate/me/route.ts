import { NextResponse } from "next/server";
import { getSession, isAdminEmail } from "@/lib/translate-auth";
import {
  getGlobalSettings,
  getRoles,
  getLearningExamples,
  getRoleHistory,
  findUserById,
  getUserLimits
} from "@/lib/translate-store";
import { DEFAULT_GLOBAL_SETTINGS } from "@/lib/translate-types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: true, data: null });
  }
  const user = await findUserById(session.userId);
  // On Vercel, /tmp is per-instance; user may exist on another instance. Trust JWT and return minimal me so login still works.
  if (!user) {
    return NextResponse.json({
      ok: true,
      data: {
        user: { id: session.userId, email: session.email },
        settings: { ...DEFAULT_GLOBAL_SETTINGS },
        roles: [],
        limits: { maxPerMessage: 200, maxPerDay: 2000 },
        isAdmin: isAdminEmail(session.email)
      }
    });
  }
  const [settings, roles, limits] = await Promise.all([
    getGlobalSettings(session.userId),
    getRoles(session.userId),
    getUserLimits(session.userId)
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
      roles: rolesWithCount,
      limits,
      isAdmin: isAdminEmail(user.email)
    }
  });
}
