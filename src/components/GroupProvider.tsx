"use client";

import * as React from "react";
import type { Group, GroupMember, GroupRole } from "@/lib/types";

type GroupContextValue = {
  group: Group;
  member: GroupMember;
  role: GroupRole;
  userId: string;
};

const GroupContext = React.createContext<GroupContextValue | null>(null);

export function GroupProvider({
  group,
  member,
  userId,
  children,
}: {
  group: Group;
  member: GroupMember;
  userId: string;
  children: React.ReactNode;
}) {
  return (
    <GroupContext.Provider value={{ group, member, role: member.role, userId }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const ctx = React.useContext(GroupContext);
  if (!ctx) throw new Error("useGroup must be used within GroupProvider");
  return ctx;
}

