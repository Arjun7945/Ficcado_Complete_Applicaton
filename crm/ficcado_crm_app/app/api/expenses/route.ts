import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const rawExpenses = await apiClient.get('/api/expenses', {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    const expenses = (rawExpenses || []).map((e: any) => ({
      id: e.id,
      sno: String(e.id),
      rowIndex: e.id,
      adminName: e.adminName,
      createdBy: e.adminName,
      category: e.expenseCategory,
      expenseCategory: e.expenseCategory,
      customCategory: e.customCategory || '',
      displayCategory:
        (e.expenseCategory === 'Other' || e.expenseCategory === 'OTHER') && e.customCategory
          ? e.customCategory
          : e.expenseCategory || 'Other',
      description: e.description || '',
      amount: String(e.amount || 0),
      dateOfExpense: e.dateOfExpense || '',
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return Response.json({ expenses });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load expenses." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = {
      expenseCategory: body.expenseCategory || body.category,
      customCategory: body.customCategory || '',
      description: body.description || '',
      amount: typeof body.amount === 'string' ? parseFloat(body.amount || '0') : body.amount,
      dateOfExpense: body.dateOfExpense || new Date().toISOString().split('T')[0],
    };

    const saved = await apiClient.post('/api/expenses', payload, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    return Response.json({ success: true, message: 'Expense recorded.', expense: saved }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't record expense." }, { status: 500 });
  }
}
