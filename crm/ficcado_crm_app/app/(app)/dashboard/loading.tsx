import LoadingGecko from '@/components/LoadingGecko';

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingGecko label="Loading CRM dashboard..." />
    </div>
  );
}
