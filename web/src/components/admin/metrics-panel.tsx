"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";

import type { AdminMetrics } from "@/types/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MetricsPanelProps = {
  metrics: AdminMetrics;
};

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Зарегистрированные пользователи</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-[#b8473f]">
            {metrics.registeredUsersCount}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Пользователей прошли регистрацию
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>DAU (ежедневно)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics.dau}>
              <XAxis
                dataKey="label"
                stroke="#7f8a94"
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="#7f8a94" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(22, 26, 31, 0.9)",
                  border: "1px solid rgba(184,71,63,0.4)",
                  borderRadius: "8px",
                  color: "#f6f1e6",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#b8473f"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>WAU (еженедельно)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics.wau}>
              <XAxis
                dataKey="label"
                stroke="#7f8a94"
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="#7f8a94" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(22, 26, 31, 0.9)",
                  border: "1px solid rgba(8,200,112,0.4)",
                  borderRadius: "8px",
                  color: "#f6f1e6",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#08c870"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Воронка до получения билета</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.funnel}>
              <XAxis
                dataKey="step"
                stroke="#7f8a94"
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="#7f8a94" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(22, 26, 31, 0.9)",
                  border: "1px solid rgba(184,71,63,0.4)",
                  borderRadius: "8px",
                  color: "#f6f1e6",
                }}
              />
              <Bar dataKey="value" fill="#b8473f" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

