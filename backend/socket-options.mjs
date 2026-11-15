// Compress large snapshots, not tiny control packets. Level 1 and a small
// concurrency cap keep compression from competing with the simulation.
export const socketCompression={
 threshold:512,serverNoContextTakeover:true,clientNoContextTakeover:true,
 concurrencyLimit:4,zlibDeflateOptions:{level:1},
};
