import { GetPermissionOriginsMsg, RemovePermissionOrigin } from "./messages";
import { Env, Handler, InternalHandler, Message } from "@keplr/router";
import { PermissionService } from "./service";

export const getHandler: (service: PermissionService) => Handler = (
  service
) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case GetPermissionOriginsMsg:
        return handleGetPermissionOriginsMsg(service)(
          env,
          msg as GetPermissionOriginsMsg
        );
      case RemovePermissionOrigin:
        return handleRemovePermissionOrigin(service)(
          env,
          msg as RemovePermissionOrigin
        );
      default:
        throw new Error("Unknown msg type");
    }
  };
};

const handleGetPermissionOriginsMsg: (
  service: PermissionService
) => InternalHandler<GetPermissionOriginsMsg> = (service) => {
  return (_, msg) => {
    return service.getPermissionOrigins(msg.permissionType);
  };
};

const handleRemovePermissionOrigin: (
  service: PermissionService
) => InternalHandler<RemovePermissionOrigin> = (service) => {
  return async (_, msg) => {
    await service.removePermission(msg.permissionType, [msg.permissionOrigin]);
  };
};
