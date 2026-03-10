export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Get the Google Apps Script URL from environment variables
    const googleAppsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!googleAppsScriptUrl) {
      return Response.json(
        {
          error: 'Google Apps Script URL not configured. Please set GOOGLE_APPS_SCRIPT_URL environment variable.',
        },
        { status: 400 }
      );
    }

    // Forward the data to Google Apps Script
    const response = await fetch(googleAppsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return Response.json(
        { error: 'Failed to submit data to Google Sheets' },
        { status: response.status }
      );
    }

    const result = await response.json();

    return Response.json({
      success: true,
      message: 'Data submitted successfully',
      data: result,
    });
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
