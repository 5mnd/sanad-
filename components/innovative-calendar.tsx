"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Circle,
  Bell,
  Trash2,
  Edit
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string;
  date: Date;
  time?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  userId: string;
  notified: boolean;
}

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function InnovativeCalendar({ userId }: { userId: string }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    time: "",
    priority: "medium" as Task['priority']
  });

  // Load tasks
  useEffect(() => {
    const loadedTasks = JSON.parse(localStorage.getItem("tasks") || "[]");
    setTasks(loadedTasks.map((t: any) => ({
      ...t,
      date: new Date(t.date)
    })));
  }, []);

  // Check for task notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const updatedTasks = tasks.map(task => {
        if (!task.completed && !task.notified && task.time) {
          const taskDateTime = new Date(task.date);
          const [hours, minutes] = task.time.split(':');
          taskDateTime.setHours(parseInt(hours), parseInt(minutes));
          
          // Notify 5 minutes before
          const timeDiff = taskDateTime.getTime() - now.getTime();
          if (timeDiff > 0 && timeDiff <= 5 * 60 * 1000) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('تذكير بمهمة', {
                body: `${task.title} - ${task.time}`,
                icon: '/icon-192.svg'
              });
            }
            return { ...task, notified: true };
          }
        }
        return task;
      });
      
      if (JSON.stringify(updatedTasks) !== JSON.stringify(tasks)) {
        setTasks(updatedTasks);
        localStorage.setItem("tasks", JSON.stringify(updatedTasks));
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [tasks]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => 
      task.userId === userId &&
      task.date.toDateString() === date.toDateString()
    );
  };

  const addTask = () => {
    if (!newTask.title.trim()) return;

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      date: selectedDate,
      time: newTask.time || undefined,
      priority: newTask.priority,
      completed: false,
      userId,
      notified: false
    };

    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
    
    setNewTask({ title: "", description: "", time: "", priority: "medium" });
    setIsAddDialogOpen(false);
  };

  const updateTask = () => {
    if (!editingTask || !newTask.title.trim()) return;

    const updatedTasks = tasks.map(t => 
      t.id === editingTask.id 
        ? {
            ...t,
            title: newTask.title,
            description: newTask.description,
            time: newTask.time || undefined,
            priority: newTask.priority,
            notified: false
          }
        : t
    );

    setTasks(updatedTasks);
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
    
    setEditingTask(null);
    setNewTask({ title: "", description: "", time: "", priority: "medium" });
    setIsAddDialogOpen(false);
  };

  const toggleTaskComplete = (taskId: string) => {
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    setTasks(updatedTasks);
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
  };

  const deleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTasks);
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description,
      time: task.time || "",
      priority: task.priority
    });
    setIsAddDialogOpen(true);
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
    }
  };

  const getPriorityText = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'عالية';
      case 'medium': return 'متوسطة';
      case 'low': return 'منخفضة';
    }
  };

  const selectedDateTasks = getTasksForDate(selectedDate);
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              التقويم
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="text-lg font-semibold min-w-[150px] text-center">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {DAYS.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const dayTasks = getTasksForDate(date);
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isTodayDate = isToday(date);
              
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "aspect-square p-2 rounded-xl transition-all relative",
                    "hover:bg-muted hover:scale-105",
                    isSelected && "bg-primary text-primary-foreground shadow-lg scale-105",
                    isTodayDate && !isSelected && "border-2 border-primary",
                    !isSelected && !isTodayDate && "bg-card"
                  )}
                >
                  <div className="text-sm font-medium">{day}</div>
                  {dayTasks.length > 0 && (
                    <div className="absolute bottom-1 right-1/2 translate-x-1/2 flex gap-0.5">
                      {dayTasks.slice(0, 3).map((task, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            task.completed ? "bg-green-500" : getPriorityColor(task.priority)
                          )}
                        />
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-[8px] font-bold">+{dayTasks.length - 3}</div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              مهام {selectedDate.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })}
            </CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) {
                setEditingTask(null);
                setNewTask({ title: "", description: "", time: "", priority: "medium" });
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 ml-1" />
                  إضافة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">عنوان المهمة *</label>
                    <Input
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="مثال: اجتماع مع العميل"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">الوصف</label>
                    <Textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="تفاصيل المهمة..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">الوقت (اختياري)</label>
                    <Input
                      type="time"
                      value={newTask.time}
                      onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">الأولوية</label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value: Task['priority']) => 
                        setNewTask({ ...newTask, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">منخفضة</SelectItem>
                        <SelectItem value="medium">متوسطة</SelectItem>
                        <SelectItem value="high">عالية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={editingTask ? updateTask : addTask} 
                    className="w-full"
                  >
                    {editingTask ? 'حفظ التعديلات' : 'إضافة المهمة'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="space-y-2 p-4">
              {selectedDateTasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد مهام في هذا اليوم</p>
                </div>
              ) : (
                selectedDateTasks.map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all",
                      task.completed ? "bg-muted/50 opacity-75" : "bg-card hover:shadow-md"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleTaskComplete(task.id)}
                        className="mt-0.5"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={cn(
                            "font-medium",
                            task.completed && "line-through text-muted-foreground"
                          )}>
                            {task.title}
                          </h4>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditDialog(task)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => deleteTask(task.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {task.time && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 ml-1" />
                              {task.time}
                            </Badge>
                          )}
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getPriorityColor(task.priority), "text-white border-0")}
                          >
                            {getPriorityText(task.priority)}
                          </Badge>
                          {task.time && !task.completed && (
                            <Badge variant="outline" className="text-xs">
                              <Bell className="w-3 h-3 ml-1" />
                              تذكير
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
