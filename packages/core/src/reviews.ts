export const CARD_COOLDOWN_MS=10*60*1000;
export function feedbackRetrySeconds(lastSubmission:Date|null,now:Date):number {
 return lastSubmission?Math.max(0,Math.ceil((lastSubmission.getTime()+CARD_COOLDOWN_MS-now.getTime())/1000)):0;
}
export function googleReviewUrl(placeId:string):string {
 const url=new URL('https://search.google.com/local/writereview');url.searchParams.set('placeid',placeId);return url.href;
}
