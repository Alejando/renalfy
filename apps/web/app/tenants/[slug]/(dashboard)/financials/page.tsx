import { isNextInternalError } from '@/lib/api';
import { getSessionUser } from '../../../../../lib/session';
import { ErrorState } from '../../../../components/error-state';
import { FinancialsPageClient } from './financials-page-client';
import {
  fetchSalesAction,
  fetchIncomesAction,
  fetchExpensesAction,
  fetchCashClosesAction,
} from '../../../../actions/financials';

interface FinancialsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FinancialsPage({ searchParams }: FinancialsPageProps) {
  const params = await searchParams;
  const tab = typeof params['tab'] === 'string' ? params['tab'] : 'sales';
  const dateFrom = typeof params['dateFrom'] === 'string' ? params['dateFrom'] : undefined;
  const dateTo = typeof params['dateTo'] === 'string' ? params['dateTo'] : undefined;
  const clientId = typeof params['clientId'] === 'string' ? params['clientId'] : undefined;
  const status = typeof params['status'] === 'string' ? params['status'] : undefined;
  const type = typeof params['type'] === 'string' ? params['type'] : undefined;

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return <ErrorState message="No se pudo obtener la sesión del usuario." />;
  }

  try {
    let salesData, incomesData, expensesData, cashClosesData;

    // Fetch data based on active tab to avoid unnecessary API calls
    switch (tab) {
      case 'income':
        incomesData = await fetchIncomesAction({ dateFrom, dateTo, type });
        break;
      case 'expense':
        expensesData = await fetchExpensesAction({ dateFrom, dateTo, type });
        break;
      case 'cashClose':
        cashClosesData = await fetchCashClosesAction({ dateFrom, dateTo });
        break;
      default:
        // 'sales' or default
        salesData = await fetchSalesAction({ dateFrom, dateTo, clientId, status });
    }

    return (
      <FinancialsPageClient
        tab={tab}
        userRole={sessionUser.role}
        userLocationId={sessionUser.locationId}
        salesData={salesData}
        incomesData={incomesData}
        expensesData={expensesData}
        cashClosesData={cashClosesData}
        dateFrom={dateFrom}
        dateTo={dateTo}
        clientId={clientId}
        status={status}
        type={type}
      />
    );
  } catch (error) {
    if (isNextInternalError(error)) throw error;
    return <ErrorState message="No se pudieron cargar los datos financieros." />;
  }
}
