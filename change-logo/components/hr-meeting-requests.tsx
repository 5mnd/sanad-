'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar, Check, X, MessageSquare, Clock, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MeetingRequest {
  id: string
  employeeId: string
  employeeName?: string
  requestType: 'meeting' | 'summon'
  requestedBy: 'employee' | 'hr'
  date: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requestDate: string
  responseComment?: string
  respondedBy?: string
  respondedAt?: string
}

interface HRMeetingRequestsProps {
  language: 'ar' | 'en'
}

export function HRMeetingRequests({ language }: HRMeetingRequestsProps) {
  const { toast } = useToast()
  const [requests, setRequests] = useState<MeetingRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<MeetingRequest | null>(null)
  const [showResponseDialog, setShowResponseDialog] = useState(false)
  const [responseComment, setResponseComment] = useState('')
  const [responseAction, setResponseAction] = useState<'approve' | 'reject'>('approve')

  // Load requests
  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = () => {
    try {
      const stored = localStorage.getItem('sanad_meeting_requests')
      if (stored) {
        const allRequests: MeetingRequest[] = JSON.parse(stored)
        
        // Get user names
        const usersJson = localStorage.getItem('sanad_users')
        const users = usersJson ? JSON.parse(usersJson) : []
        
        // Add employee names to requests
        const requestsWithNames = allRequests.map(req => ({
          ...req,
          employeeName: users.find((u: any) => u.id === req.employeeId)?.nameAr || 'موظف غير معروف'
        }))
        
        setRequests(requestsWithNames)
      }
    } catch (error) {
      console.error('Error loading meeting requests:', error)
    }
  }

  const handleResponse = (request: MeetingRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request)
    setResponseAction(action)
    setResponseComment('')
    setShowResponseDialog(true)
  }

  const submitResponse = () => {
    if (!selectedRequest) return

    try {
      const stored = localStorage.getItem('sanad_meeting_requests')
      const allRequests: MeetingRequest[] = stored ? JSON.parse(stored) : []
      
      const currentUser = JSON.parse(localStorage.getItem('sanad_current_user') || '{}')
      
      const updatedRequests = allRequests.map(req => {
        if (req.id === selectedRequest.id) {
          return {
            ...req,
            status: responseAction === 'approve' ? 'approved' : 'rejected',
            responseComment: responseComment || undefined,
            respondedBy: currentUser.nameAr || currentUser.username,
            respondedAt: new Date().toISOString()
          }
        }
        return req
      })

      localStorage.setItem('sanad_meeting_requests', JSON.stringify(updatedRequests))
      loadRequests()
      setShowResponseDialog(false)
      
      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' 
          ? `تم ${responseAction === 'approve' ? 'الموافقة على' : 'رفض'} الطلب`
          : `Request ${responseAction === 'approve' ? 'approved' : 'rejected'}`,
      })
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'حدث خطأ أثناء معالجة الطلب' : 'Error processing request',
        variant: 'destructive'
      })
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const processedRequests = requests.filter(r => r.status !== 'pending')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Clock className="h-3 w-3 mr-1" />
          {language === 'ar' ? 'قيد الانتظار' : 'Pending'}
        </Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <Check className="h-3 w-3 mr-1" />
          {language === 'ar' ? 'موافق عليه' : 'Approved'}
        </Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          <X className="h-3 w-3 mr-1" />
          {language === 'ar' ? 'مرفوض' : 'Rejected'}
        </Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {language === 'ar' ? 'طلبات المقابلات المعلقة' : 'Pending Meeting Requests'}
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>{language === 'ar' ? 'لا توجد طلبات معلقة' : 'No pending requests'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'الموظف' : 'Employee'}</TableHead>
                  <TableHead>{language === 'ar' ? 'التاريخ المطلوب' : 'Requested Date'}</TableHead>
                  <TableHead>{language === 'ar' ? 'السبب' : 'Reason'}</TableHead>
                  <TableHead>{language === 'ar' ? 'تاريخ الطلب' : 'Request Date'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {request.employeeName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(request.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                    <TableCell>
                      {new Date(request.requestDate).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/20"
                          onClick={() => handleResponse(request, 'approve')}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {language === 'ar' ? 'موافقة' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-600 border-red-500/20"
                          onClick={() => handleResponse(request, 'reject')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          {language === 'ar' ? 'رفض' : 'Reject'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {language === 'ar' ? 'الطلبات المعالجة' : 'Processed Requests'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'الموظف' : 'Employee'}</TableHead>
                  <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead>{language === 'ar' ? 'السبب' : 'Reason'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الرد' : 'Response'}</TableHead>
                  <TableHead>{language === 'ar' ? 'تم الرد بواسطة' : 'Responded By'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.slice(0, 10).map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.employeeName}</TableCell>
                    <TableCell>
                      {new Date(request.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {request.responseComment || (language === 'ar' ? 'لا يوجد تعليق' : 'No comment')}
                    </TableCell>
                    <TableCell>{request.respondedBy || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'ar' 
                ? `${responseAction === 'approve' ? 'الموافقة على' : 'رفض'} طلب المقابلة`
                : `${responseAction === 'approve' ? 'Approve' : 'Reject'} Meeting Request`
              }
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">
                  {language === 'ar' ? 'الموظف:' : 'Employee:'}
                </p>
                <p className="text-sm text-muted-foreground">{selectedRequest.employeeName}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">
                  {language === 'ar' ? 'التاريخ المطلوب:' : 'Requested Date:'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedRequest.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">
                  {language === 'ar' ? 'السبب:' : 'Reason:'}
                </p>
                <p className="text-sm text-muted-foreground">{selectedRequest.reason}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {language === 'ar' ? 'تعليق (اختياري):' : 'Comment (optional):'}
                </label>
                <Textarea
                  value={responseComment}
                  onChange={(e) => setResponseComment(e.target.value)}
                  placeholder={language === 'ar' ? 'أضف تعليقاً...' : 'Add a comment...'}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={submitResponse}
              className={responseAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {language === 'ar' 
                ? (responseAction === 'approve' ? 'موافقة' : 'رفض')
                : (responseAction === 'approve' ? 'Approve' : 'Reject')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
