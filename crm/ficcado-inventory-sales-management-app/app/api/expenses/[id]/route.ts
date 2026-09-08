import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await request.json();
    const payload = {
      expenseCategory: body.expenseCategory || body.category,
      customCategory: body.customCategory || '',
      description: body.description || '',
      amount: typeof body.amount === 'string' ? parseFloat(body.amount || '0') : body.amount,
      dateOfExpense: body.dateOfExpense || new Date().toISOString().split('T')[0],
    };

    const updated = await apiClient.put(`/api/expenses/${params.id}`, payload, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ success: true, expense: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update expense." }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await apiClient.delete(`/api/expenses/${params.id}`, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't delete expense." }, { status: 500 });
  }
}
