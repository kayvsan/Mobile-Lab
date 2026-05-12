#!/usr/bin/env python3
"""
APM Android Automation - Main Entry Point
"""
import sys
import argparse
import json
from pathlib import Path

# Add current directory to path for imports
sys.path.append(str(Path(__file__).parent))

from core.executor import JourneyExecutor
from core.logger import setup_logger, get_logger


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description='APM Android Journey Runner - Modular Edition',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        '-d', '--device',
        required=True,
        help='Device ID from config/device.json'
    )
    parser.add_argument(
        '-j', '--journey',
        required=False,
        help='Journey file name from config/journeys/'
    )
    parser.add_argument(
        '--api-url',
        required=False,
        help='Full URL to fetch journey JSON from Backend API'
    )
    parser.add_argument(
        '--api-key',
        required=False,
        help='API Key for authenticating to the Backend'
    )
    parser.add_argument(
        '--exec-id',
        required=False,
        help='Execution ID from Backend'
    )
    parser.add_argument(
        '-c', '--config',
        default='config',
        help='Config directory (default: config)'
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Enable debug logging'
    )
    
    return parser.parse_args()


def main():
    """Main entry point"""
    args = parse_args()
    
    # Setup logging
    log_level = "DEBUG" if args.verbose else "INFO"
    setup_logger(
        level=log_level,
        log_file="logs/apm_{timestamp}.log"
    )
    
    logger = get_logger("main")
    logger.info(f"APM Modular starting...")
    if args.api_url:
        logger.info(f"Device: {args.device}, API Source: {args.api_url}")
    else:
        logger.info(f"Device: {args.device}, Journey File: {args.journey}")
    
    # Initialize executor
    executor = JourneyExecutor(config_dir=args.config)
    
    # Run journey
    result = executor.run(
        device_id=args.device, 
        journey_filename=args.journey,
        api_url=args.api_url,
        api_key=args.api_key,
        exec_id=args.exec_id
    )
    
    # Save report
    report_path = executor.save_report(result)
    logger.info(f"Report saved: {report_path}")
    
    # Output summary
    logger.info("=" * 60)
    if result.get('success'):
        summary = result.get('summary', {})
        logger.info("RESULT: SUCCESS")
        logger.info("  Total Response Time : %ss", summary.get('total_response_time', 'N/A'))
        logger.info("  Screenshots Taken   : %s",  summary.get('screenshots', 0))
    else:
        logger.error("RESULT: FAILED")
        logger.error("  Error: %s", result.get('error', 'Unknown error'))
    logger.info("=" * 60)
    
    sys.exit(0 if result.get('success') else 1)


if __name__ == '__main__':
    main()
