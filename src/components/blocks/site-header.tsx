import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';

export function SiteHeader({
  breadcrumbs,
  onNavigate,
}: {
  breadcrumbs?: { label: string; page: string }[];
  onNavigate: (page: string) => void;
}) {
  const { t, i18n } = useTranslation();

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb dir="rtl">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, i) => (
                <BreadcrumbItem key={crumb.page}>
                  {i < breadcrumbs.length - 1 ? (
                    <>
                      <BreadcrumbLink asChild>
                        <button onClick={() => onNavigate(crumb.page)} className="hover:text-primary text-sm">
                          {crumb.label}
                        </button>
                      </BreadcrumbLink>
                      <BreadcrumbSeparator />
                    </>
                  ) : (
                    <BreadcrumbPage className="text-sm">{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-green-700 font-arabic">{t('common.bismillah')}</span>
          <Separator orientation="vertical" className="mx-1 h-4" />
          <span>
            {new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-DZ' : i18n.language, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>
    </header>
  );
}
