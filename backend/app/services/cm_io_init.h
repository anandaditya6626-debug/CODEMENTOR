#ifndef _CODEMENTOR_IO_INIT_H_
#define _CODEMENTOR_IO_INIT_H_
#include <stdio.h>
#ifdef __cplusplus
extern "C" {
#endif
static void __attribute__((constructor)) __cm_init_io(void) {
    setvbuf(stdout, NULL, _IONBF, 0);
    setvbuf(stderr, NULL, _IONBF, 0);
}
#ifdef __cplusplus
}
#endif
#endif
