"use client"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react"

interface Task {
  id: string
  title: string
  description?: string
  status: "pending" | "in-progress" | "completed" | "overdue"
  priority?: "low" | "medium" | "high"
  dueDate?: string
}

interface TaskListProps {
  title: string
  tasks: Task[]
  onTaskToggle?: (taskId: string) => void
  className?: string
}

const statusIcons = {
  pending: Circle,
  "in-progress": Clock,
  completed: CheckCircle2,
  overdue: AlertCircle,
}

const statusColors = {
  pending: "text-muted-foreground",
  "in-progress": "text-blue-500",
  completed: "text-green-500",
  overdue: "text-red-500",
}

const priorityColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

export function TaskList({ title, tasks, onTaskToggle, className }: TaskListProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => {
          const StatusIcon = statusIcons[task.status]
          return (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 mt-0.5"
                onClick={() => onTaskToggle?.(task.id)}
              >
                <StatusIcon className={`h-4 w-4 ${statusColors[task.status]}`} />
              </Button>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-sm font-medium ${
                      task.status === "completed" ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {task.title}
                  </h4>
                  {task.priority && (
                    <Badge variant="secondary" className={`text-xs ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </Badge>
                  )}
                </div>
                {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                {task.dueDate && <p className="text-xs text-muted-foreground">Vence: {task.dueDate}</p>}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
