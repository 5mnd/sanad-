"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  MessageCircle, 
  Send, 
  Search, 
  Circle,
  Clock,
  Coffee,
  LogOut,
  CheckCheck,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

interface User {
  id: string;
  name: string;
  status: 'present' | 'absent' | 'break' | 'authorized';
  lastSeen?: Date;
}

export default function InternalMessaging({ currentUserId, currentUserName }: { currentUserId: string; currentUserName: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load users from localStorage
  useEffect(() => {
    const loadedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    const attendance = JSON.parse(localStorage.getItem("attendance") || "[]");
    
    const usersWithStatus = loadedUsers.map((user: any) => {
      const todayAttendance = attendance.find(
        (a: any) => a.userId === user.id && 
        new Date(a.date).toDateString() === new Date().toDateString()
      );
      
      let status: User['status'] = 'absent';
      if (todayAttendance) {
        if (todayAttendance.status === 'حاضر') status = 'present';
        else if (todayAttendance.status === 'استراحة') status = 'break';
        else if (todayAttendance.status === 'مستأذن') status = 'authorized';
      }
      
      return {
        id: user.id,
        name: user.name,
        status
      };
    });
    
    setUsers(usersWithStatus);
  }, []);

  // Load messages
  useEffect(() => {
    const loadedMessages = JSON.parse(localStorage.getItem("messages") || "[]");
    setMessages(loadedMessages.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp)
    })));
  }, []);

  // Calculate unread counts
  useEffect(() => {
    const counts: Record<string, number> = {};
    messages.forEach(msg => {
      if (msg.receiverId === currentUserId && !msg.read) {
        counts[msg.senderId] = (counts[msg.senderId] || 0) + 1;
      }
    });
    setUnreadCounts(counts);
  }, [messages, currentUserId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedUser]);

  // Mark messages as read when opening chat
  useEffect(() => {
    if (selectedUser) {
      const updatedMessages = messages.map(msg => {
        if (msg.senderId === selectedUser.id && msg.receiverId === currentUserId && !msg.read) {
          return { ...msg, read: true };
        }
        return msg;
      });
      setMessages(updatedMessages);
      localStorage.setItem("messages", JSON.stringify(updatedMessages));
    }
  }, [selectedUser]);

  const sendMessage = () => {
    if (!messageText.trim() || !selectedUser) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUserId,
      senderName: currentUserName,
      receiverId: selectedUser.id,
      content: messageText,
      timestamp: new Date(),
      read: false
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    localStorage.setItem("messages", JSON.stringify(updatedMessages));
    setMessageText("");

    // Simulate real-time update
    setTimeout(() => {
      const refreshed = JSON.parse(localStorage.getItem("messages") || "[]");
      setMessages(refreshed.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      })));
    }, 500);
  };

  const getStatusIcon = (status: User['status']) => {
    switch (status) {
      case 'present':
        return <Circle className="w-3 h-3 fill-green-500 text-green-500" />;
      case 'break':
        return <Coffee className="w-3 h-3 text-orange-500" />;
      case 'authorized':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      case 'absent':
        return <LogOut className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusText = (status: User['status']) => {
    switch (status) {
      case 'present': return 'حاضر';
      case 'break': return 'استراحة';
      case 'authorized': return 'مستأذن';
      case 'absent': return 'غائب';
    }
  };

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'break': return 'bg-orange-500';
      case 'authorized': return 'bg-yellow-500';
      case 'absent': return 'bg-gray-400';
    }
  };

  const filteredUsers = users.filter(u => 
    u.id !== currentUserId && 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentChat = selectedUser ? messages.filter(
    m => (m.senderId === currentUserId && m.receiverId === selectedUser.id) ||
         (m.senderId === selectedUser.id && m.receiverId === currentUserId)
  ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()) : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Users List */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            المحادثات
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن موظف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[480px]">
            <div className="space-y-1 p-4">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-right",
                    selectedUser?.id === user.id 
                      ? "bg-primary/10 border border-primary/20" 
                      : "hover:bg-muted"
                  )}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
                      getStatusColor(user.status)
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{user.name}</p>
                      {unreadCounts[user.id] > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
                          {unreadCounts[user.id]}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {getStatusIcon(user.status)}
                      <span>{getStatusText(user.status)}</span>
                    </div>
                  </div>
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  لا يوجد موظفين
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="md:col-span-2">
        {selectedUser ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
                    getStatusColor(selectedUser.status)
                  )} />
                </div>
                <div>
                  <h3 className="font-semibold">{selectedUser.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {getStatusIcon(selectedUser.status)}
                    <span>{getStatusText(selectedUser.status)}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col h-[480px]">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {currentChat.map(msg => {
                    const isSent = msg.senderId === currentUserId;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          isSent ? "justify-start" : "justify-end"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2",
                            isSent 
                              ? "bg-primary text-primary-foreground rounded-tr-sm" 
                              : "bg-muted rounded-tl-sm"
                          )}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <div className={cn(
                            "flex items-center gap-1 justify-end mt-1 text-xs",
                            isSent ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            <span>
                              {msg.timestamp.toLocaleTimeString('ar-SA', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {isSent && (
                              msg.read ? 
                                <CheckCheck className="w-3 h-3" /> : 
                                <Check className="w-3 h-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {currentChat.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>ابدأ المحادثة الآن</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="border-t p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="اكتب رسالتك..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">اختر محادثة للبدء</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
