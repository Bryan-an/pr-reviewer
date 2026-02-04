import "server-only";

export function toOriginRemoteTrackingRef(refName: string): {
  fetchRefspec?: string;
  ref: string;
} {
  const headsPrefix = "refs/heads/";

  if (refName.startsWith(headsPrefix)) {
    const branchName = refName.slice(headsPrefix.length);
    const remoteTrackingRef = `refs/remotes/origin/${branchName}`;

    return {
      fetchRefspec: `+${refName}:${remoteTrackingRef}`,
      ref: remoteTrackingRef,
    };
  }

  return { ref: refName };
}
