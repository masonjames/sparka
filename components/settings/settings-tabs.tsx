"use client";

import { Cpu, Plug, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelsSettings } from "./models-settings";

export function SettingsTabs({ defaultTab }: { defaultTab: string }) {
  return (
    <Tabs
      className="flex min-h-[500px] gap-8"
      defaultValue={defaultTab}
      orientation="vertical"
    >
      <TabsList className="flex h-auto w-56 flex-col items-stretch justify-start gap-1 bg-transparent p-0">
        <TabsTrigger
          className="justify-start gap-3 rounded-md px-3 py-2.5 text-muted-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none"
          value="general"
        >
          <Settings className="size-4" />
          General
        </TabsTrigger>
        <TabsTrigger
          className="justify-start gap-3 rounded-md px-3 py-2.5 text-muted-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none"
          value="models"
        >
          <Cpu className="size-4" />
          Models
        </TabsTrigger>
        <TabsTrigger
          className="justify-start gap-3 rounded-md px-3 py-2.5 text-muted-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:shadow-none"
          value="mcp"
        >
          <Plug className="size-4" />
          MCP
        </TabsTrigger>
      </TabsList>

      <div className="flex-1">
        <TabsContent className="m-0" value="general">
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-lg">General</h2>
              <p className="text-muted-foreground text-sm">
                General settings will be available here soon.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent className="m-0" value="models">
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-lg">Models</h2>
              <p className="text-muted-foreground text-sm">
                Configure your AI model preferences.
              </p>
            </div>
            <ModelsSettings />
          </div>
        </TabsContent>

        <TabsContent className="m-0" value="mcp">
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-lg">MCP Configuration</h2>
              <p className="text-muted-foreground text-sm">
                MCP (Model Context Protocol) settings will be available here
                soon.
              </p>
            </div>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}
