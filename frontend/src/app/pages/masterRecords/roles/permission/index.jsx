import { Page } from "components/shared/Page";

export default function Permission() {
  return (
    <Page title="Permission">
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
                <div className="mb-6">
                  <i
                    className="pi pi-cog animate-spin text-6xl text-blue-500"
                    style={{ animationDuration: "5s" }}
                  />
                </div>
                <h1 className="mb-4 text-3xl font-bold text-gray-800">
                  Permission Management
                </h1>
                <h2 className="mb-6 text-xl font-semibold text-blue-600">
                  Coming Soon!
                </h2>
                <p className="mb-4 max-w-md text-gray-600">
                  We&apos;re working hard to bring you an amazing permission
                  management system. This feature will allow you to control user
                  access and permissions with ease.
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <i className="pi pi-clock" />
                  <span>Stay tuned for updates!</span>
                </div>
                <div className="mt-6 flex gap-2">
                  <div
                    className="h-2 w-2 animate-pulse rounded-full bg-blue-500"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="h-2 w-2 animate-pulse rounded-full bg-blue-500"
                    style={{ animationDelay: "200ms" }}
                  />
                  <div
                    className="h-2 w-2 animate-pulse rounded-full bg-blue-500"
                    style={{ animationDelay: "400ms" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
