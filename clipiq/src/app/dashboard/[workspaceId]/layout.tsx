import { getUserNotifications, onAuthenticated } from "@/app/actions/user";
import {
  getUserVideos,
  getUserWorkspaces,
  getWorkspaceFolders,
  verifyWorkspace,
} from "@/app/actions/workspace";
import GlobalHeader from "@/components/global/global-header";
import ClientWrapper from "@/components/global/maincontainer";
import Sidebar from "@/components/global/sidebar";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { redirect, usePathname } from "next/navigation";
import React, { ReactNode } from "react";

type Props = {
  params: { workspaceId: string };
  children: React.ReactNode;
};
const DashboardLayout = async ({ params, children }: Props) => {
  const { workspaceId } = await params;
  const auth = await onAuthenticated();
  if (!auth.user?.workspace) return redirect(`/auth/sign-in`);
  if (!auth.user.workspace.length) return redirect("/auth/sign-in");

  const hasAccess = await verifyWorkspace(workspaceId);
  if (hasAccess.status !== 200) {
    // If the “first workspace” is different than current workspaceId, redirect
    const firstWorkspaceId = auth.user.workspace[0].id;
    if (firstWorkspaceId !== workspaceId) {
      return redirect(`/dashboard/${firstWorkspaceId}`);
    }
  }
  if (!hasAccess.data?.workspace) return null;

  const queryClient = new QueryClient();

  //prefetching workspace data to ensure caching and refreshing behind the scenes

  await queryClient.prefetchQuery({
    queryKey: ["workspace-folders"],
    queryFn: async () => getWorkspaceFolders(workspaceId),
  });
  await queryClient.prefetchQuery({
    queryKey: ["user-videos"],
    queryFn: async () => getUserVideos(workspaceId),
  });
  await queryClient.prefetchQuery({
    queryKey: ["user-workspaces"],
    queryFn: async () => getUserWorkspaces(),
  });
  await queryClient.prefetchQuery({
    queryKey: ["user-notifications"],
    queryFn: async () => getUserNotifications(),
  });

  const userId = auth.user.id;

  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex h-screen w-screen">
        <Sidebar activeWorkspaceId={workspaceId} userId={userId} />
        <ClientWrapper workspace={hasAccess.data.workspace}>
          {children}
        </ClientWrapper>
      </div>
    </HydrationBoundary>
  );
};
export default DashboardLayout;
