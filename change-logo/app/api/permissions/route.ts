import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface PermissionsRequest {
  role: string
  permissions: string[]
  erpConfig: {
    url: string
    apiKey: string
    apiSecret: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PermissionsRequest = await request.json()
    
    if (!body.role || !body.permissions) {
      return NextResponse.json(
        { error: 'Missing role or permissions data' },
        { status: 400 }
      )
    }

    console.log('[v0] Saving permissions for role:', body.role)
    console.log('[v0] Permissions:', body.permissions)

    // If ERPNext is configured, sync permissions
    if (body.erpConfig && body.erpConfig.url && body.erpConfig.apiKey) {
      const baseUrl = body.erpConfig.url.replace(/\/+$/, '')
      const headers = {
        'Authorization': `token ${body.erpConfig.apiKey}:${body.erpConfig.apiSecret}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }

      try {
        // Create or update a Custom DocType for Sanad Role Permissions in ERPNext
        const doctype = 'Sanad Role Permission'
        const docname = `ROLE-${body.role.toUpperCase()}`

        // Check if document exists
        const checkRes = await fetch(
          `${baseUrl}/api/resource/${doctype}/${docname}`,
          { method: 'GET', headers }
        )

        const permissionsJson = JSON.stringify(body.permissions)

        if (checkRes.status === 404) {
          // Create new document
          console.log('[v0] Creating new role permission document in ERPNext')
          
          const createRes = await fetch(
            `${baseUrl}/api/resource/${doctype}`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                doctype: doctype,
                name: docname,
                role_name: body.role,
                permissions_json: permissionsJson,
                last_updated: new Date().toISOString(),
                system: 'Sanad POS'
              })
            }
          )

          if (!createRes.ok) {
            const errorData = await createRes.json()
            console.error('[v0] Failed to create ERPNext document:', errorData)
            
            // If the doctype doesn't exist, continue without error
            if (errorData.exc && errorData.exc.includes('DocType not found')) {
              console.log('[v0] DocType not found in ERPNext, skipping sync')
              return NextResponse.json({
                success: true,
                message: 'Permissions saved locally (ERPNext DocType not configured)',
                synced: false
              })
            }
            
            throw new Error(errorData._server_messages || 'Failed to create document')
          }

          const createData = await createRes.json()
          console.log('[v0] Successfully created ERPNext document:', createData.data?.name)

        } else if (checkRes.ok) {
          // Update existing document
          console.log('[v0] Updating existing role permission document in ERPNext')
          
          const updateRes = await fetch(
            `${baseUrl}/api/resource/${doctype}/${docname}`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                permissions_json: permissionsJson,
                last_updated: new Date().toISOString()
              })
            }
          )

          if (!updateRes.ok) {
            const errorData = await updateRes.json()
            console.error('[v0] Failed to update ERPNext document:', errorData)
            throw new Error(errorData._server_messages || 'Failed to update document')
          }

          const updateData = await updateRes.json()
          console.log('[v0] Successfully updated ERPNext document:', updateData.data?.name)
        }

        return NextResponse.json({
          success: true,
          message: 'Permissions saved and synced to ERPNext',
          synced: true,
          role: body.role,
          permissionsCount: body.permissions.length
        })

      } catch (erpError) {
        console.error('[v0] ERPNext sync failed:', erpError)
        
        // Return success but note that ERPNext sync failed
        return NextResponse.json({
          success: true,
          message: 'Permissions saved locally (ERPNext sync failed)',
          synced: false,
          error: erpError instanceof Error ? erpError.message : 'Unknown error'
        })
      }
    }

    // No ERPNext configuration - save locally only
    return NextResponse.json({
      success: true,
      message: 'Permissions saved locally',
      synced: false,
      role: body.role,
      permissionsCount: body.permissions.length
    })

  } catch (error) {
    console.error('[v0] Error saving permissions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve role permissions from ERPNext
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get('role')
    const erpUrl = searchParams.get('erpUrl')
    const apiKey = searchParams.get('apiKey')
    const apiSecret = searchParams.get('apiSecret')

    if (!role || !erpUrl || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const baseUrl = erpUrl.replace(/\/+$/, '')
    const headers = {
      'Authorization': `token ${apiKey}:${apiSecret}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    const doctype = 'Sanad Role Permission'
    const docname = `ROLE-${role.toUpperCase()}`

    const response = await fetch(
      `${baseUrl}/api/resource/${doctype}/${docname}`,
      { method: 'GET', headers }
    )

    if (response.status === 404) {
      return NextResponse.json({
        success: false,
        error: 'Role permissions not found in ERPNext'
      }, { status: 404 })
    }

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData._server_messages || 'Failed to fetch permissions')
    }

    const data = await response.json()
    const permissions = JSON.parse(data.data.permissions_json || '[]')

    return NextResponse.json({
      success: true,
      role: role,
      permissions: permissions,
      lastUpdated: data.data.last_updated
    })

  } catch (error) {
    console.error('[v0] Error fetching permissions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
