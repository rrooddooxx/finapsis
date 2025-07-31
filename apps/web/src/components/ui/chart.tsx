import type * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react"

interface ChartData {
  name: string
  value: number
  color?: string
}

interface ChartProps {
  title: string
  data: ChartData[]
  type?: "bar" | "line" | "pie"
  className?: string
}

export function Chart({ title, data, type = "bar", className }: ChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.name}</span>
              <span className="font-medium">{item.value}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all duration-500"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color || "hsl(var(--primary))",
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon?: React.ReactNode
  className?: string
}

export function MetricCard({ title, value, change, icon, className }: MetricCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {change > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={`text-xs ${change > 0 ? "text-green-500" : "text-red-500"}`}>{Math.abs(change)}%</span>
              </div>
            )}
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
