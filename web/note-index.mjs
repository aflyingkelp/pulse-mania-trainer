// Interval tree: query only notes intersecting the visible scroll region.
// A hold beginning offscreen must remain visible until its tail leaves.
export class NoteIndex{
 constructor(notes,position=n=>n.t,end=n=>n.end){
  this.entries=notes.map(n=>({note:n,start:position(n),end:end(n)})).sort((a,b)=>a.start-b.start);
  this.maxEnd=new Float64Array(Math.max(1,notes.length*4));
  const build=(node,lo,hi)=>{if(lo===hi)return this.maxEnd[node]=this.entries[lo].end;let mid=(lo+hi)>>1;return this.maxEnd[node]=Math.max(build(node*2+1,lo,mid),build(node*2+2,mid+1,hi))};
  if(notes.length)build(0,0,notes.length-1);
 }
 query(start,end){let found=[],entries=this.entries;this.visited=0;
  const walk=(node,lo,hi)=>{this.visited++;if(this.maxEnd[node]<start||entries[lo].start>end)return;if(lo===hi){found.push(entries[lo].note);return}let mid=(lo+hi)>>1;walk(node*2+1,lo,mid);walk(node*2+2,mid+1,hi)};
  if(entries.length)walk(0,0,entries.length-1);return found;
 }
}
