"use client";

import { useEffect } from "react";
import type { PortalActions, PortalState } from "../store";
import { Funnels } from "../funnels/Funnels";
import { WebsiteBuilder } from "./WebsiteBuilder";
import { ClientFunnels } from "../views/ClientFunnels";
import { SocialMediaBuilder } from "./SocialMediaBuilder";

export function Builders({ state, actions }: { state: PortalState; actions: PortalActions }) {
  useEffect(() => {
    if (!state.hydrated) return;
    const params = new URLSearchParams(window.location.search);
    params.set("view", "funnels");
    params.set("builderType", state.builderType);
    params.delete("auditType");
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }, [state.builderType, state.hydrated]);
  if (state.builderType === "social") return <SocialMediaBuilder state={state} actions={actions} />;
  if (state.builderType === "website") return <WebsiteBuilder state={state} actions={actions} />;
  return state.role === "client" ? <ClientFunnels state={state} actions={actions} /> : <Funnels state={state} actions={actions} />;
}
