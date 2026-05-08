"""Logging configuration for APM Android Automation"""
import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional


def setup_logger(
    name: str = "apm",
    level: str = "INFO",
    log_file: Optional[str] = None,
    console: bool = True
) -> logging.Logger:
    """Setup and return configured logger"""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    
    logger.handlers.clear()
    
    formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)-25s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    if console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
    
    if log_file:
        if '{timestamp}' in log_file:
            log_file = log_file.replace(
                '{timestamp}', 
                datetime.now().strftime('%Y%m%d_%H%M%S')
            )
        
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_path, encoding='utf-8', mode='a')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


# Default logger instance
logger = setup_logger()


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Get logger instance, optionally with child name"""
    if name:
        return logging.getLogger(f"apm.{name}")
    return logger
