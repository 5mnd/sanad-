/**
 * ERPNext Client-Side Service
 * 
 * This service handles all ERPNext API calls from the client-side.
 * No server-side API routes are used (compatible with static export).
 */

export interface ERPNextConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export interface ERPNextSyncData {
  products?: any[];
  customers?: any[];
  invoices?: any[];
  employees?: any[];
  attendance?: any[];
}

class ERPNextService {
  private config: ERPNextConfig | null = null;

  /**
   * Initialize ERPNext connection
   */
  setConfig(config: ERPNextConfig) {
    this.config = config;
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('erpnext_config', JSON.stringify(config));
    }
  }

  /**
   * Get stored configuration
   */
  getConfig(): ERPNextConfig | null {
    if (this.config) return this.config;
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('erpnext_config');
      if (stored) {
        this.config = JSON.parse(stored);
        return this.config;
      }
    }
    
    return null;
  }

  /**
   * Test ERPNext connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const config = this.getConfig();
    if (!config) {
      return { success: false, message: 'ERPNext not configured' };
    }

    try {
      const response = await fetch(`${config.url}/api/method/frappe.auth.get_logged_user`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${config.apiKey}:${config.apiSecret}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { success: true, message: 'Connection successful' };
      } else {
        return { success: false, message: `Connection failed: ${response.statusText}` };
      }
    } catch (error: any) {
      return { success: false, message: `Connection error: ${error.message}` };
    }
  }

  /**
   * Fetch data from ERPNext
   */
  private async fetchFromERPNext(doctype: string, fields?: string[], filters?: any): Promise<any> {
    const config = this.getConfig();
    if (!config) {
      throw new Error('ERPNext not configured');
    }

    const params = new URLSearchParams({
      doctype,
      fields: fields ? JSON.stringify(fields) : JSON.stringify(['*']),
      filters: filters ? JSON.stringify(filters) : '{}',
    });

    const response = await fetch(`${config.url}/api/resource/${doctype}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `token ${config.apiKey}:${config.apiSecret}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${doctype}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Push data to ERPNext
   */
  private async pushToERPNext(doctype: string, data: any): Promise<any> {
    const config = this.getConfig();
    if (!config) {
      throw new Error('ERPNext not configured');
    }

    const response = await fetch(`${config.url}/api/resource/${doctype}`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${config.apiKey}:${config.apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to push ${doctype}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Sync products from ERPNext
   */
  async syncProducts(): Promise<any[]> {
    return await this.fetchFromERPNext('Item', [
      'name',
      'item_name',
      'item_code',
      'description',
      'standard_rate',
      'stock_uom',
      'item_group',
      'image',
    ]);
  }

  /**
   * Sync customers from ERPNext
   */
  async syncCustomers(): Promise<any[]> {
    return await this.fetchFromERPNext('Customer', [
      'name',
      'customer_name',
      'customer_type',
      'customer_group',
      'territory',
      'mobile_no',
      'email_id',
    ]);
  }

  /**
   * Sync employees from ERPNext
   */
  async syncEmployees(): Promise<any[]> {
    return await this.fetchFromERPNext('Employee', [
      'name',
      'employee_name',
      'designation',
      'department',
      'date_of_joining',
      'status',
      'cell_number',
    ]);
  }

  /**
   * Push sales invoice to ERPNext
   */
  async pushSalesInvoice(invoice: any): Promise<any> {
    const erpInvoice = {
      doctype: 'Sales Invoice',
      customer: invoice.customer || 'Walk-in Customer',
      posting_date: new Date().toISOString().split('T')[0],
      items: invoice.items.map((item: any) => ({
        item_code: item.sku || item.name,
        qty: item.quantity,
        rate: item.price,
      })),
      total: invoice.total,
      grand_total: invoice.total,
    };

    return await this.pushToERPNext('Sales Invoice', erpInvoice);
  }

  /**
   * Push attendance to ERPNext
   */
  async pushAttendance(attendance: any): Promise<any> {
    const erpAttendance = {
      doctype: 'Attendance',
      employee: attendance.employeeId,
      attendance_date: attendance.date,
      status: attendance.status, // Present, Absent, Half Day, etc.
      check_in: attendance.checkIn,
      check_out: attendance.checkOut,
    };

    return await this.pushToERPNext('Attendance', erpAttendance);
  }

  /**
   * Full sync: fetch all data from ERPNext
   */
  async fullSync(): Promise<ERPNextSyncData> {
    const [products, customers, employees] = await Promise.all([
      this.syncProducts().catch(() => []),
      this.syncCustomers().catch(() => []),
      this.syncEmployees().catch(() => []),
    ]);

    return {
      products,
      customers,
      employees,
    };
  }
}

// Export singleton instance
export const erpNextService = new ERPNextService();
